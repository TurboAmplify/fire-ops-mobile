import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildFromAddress, buildReplyToAddress } from "../_shared/resend.ts";

interface ReplyBody {
  thread_id: string;
  body_text: string;
  attachment_paths?: string[]; // storage paths in communication-attachments bucket
  // Cross-incident send guard: callers attaching a doc that belongs to a
  // specific incident/truck should pass these so we can refuse to send via a
  // thread on the wrong incident.
  source_incident_id?: string;
  source_incident_truck_id?: string;
  source_document_label?: string;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as ReplyBody;
    if (!body.thread_id || !body.body_text || body.body_text.length > 50_000) {
      return json({ error: "Invalid input" }, 400);
    }

    // Load thread + org
    const { data: thread, error: threadErr } = await supabase
      .from("communication_threads")
      .select("id, organization_id, subject, thread_token, purpose, incident_truck_id, contact_id, finance_officer_id, status")
      .eq("id", body.thread_id)
      .maybeSingle();
    if (threadErr || !thread) return json({ error: "Thread not found" }, 404);
    if (thread.status === "closed") return json({ error: "Thread closed" }, 400);

    // Resolve org handle
    const { data: org } = await supabase
      .from("organizations")
      .select("name, email_handle")
      .eq("id", thread.organization_id)
      .maybeSingle();
    if (!org?.email_handle) {
      return json({ error: "Organization email handle not configured" }, 400);
    }

    // Resolve recipient(s)
    const toEmails: string[] = [];
    if (thread.contact_id) {
      const { data: c } = await supabase
        .from("incident_truck_finance_contacts")
        .select("email_override, finance_officer_id, finance_officers ( email )")
        .eq("id", thread.contact_id)
        .maybeSingle();
      const e = c?.email_override ?? (c?.finance_officers as { email?: string } | null)?.email;
      if (e) toEmails.push(e);
    } else if (thread.finance_officer_id) {
      const { data: fo } = await supabase
        .from("finance_officers")
        .select("email")
        .eq("id", thread.finance_officer_id)
        .maybeSingle();
      if (fo?.email) toEmails.push(fo.email);
    }
    if (!toEmails.length) {
      // Fallback: use most recent inbound message's from_email
      const { data: lastIn } = await supabase
        .from("messages")
        .select("from_email")
        .eq("thread_id", thread.id)
        .eq("direction", "in")
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastIn?.from_email) toEmails.push(lastIn.from_email);
    }
    if (!toEmails.length) return json({ error: "No recipient on thread" }, 400);

    // Build attachments
    const attachments: { filename: string; content: string; content_type?: string }[] = [];
    for (const path of body.attachment_paths ?? []) {
      const { data: file } = await supabase.storage
        .from("communication-attachments")
        .download(path);
      if (!file) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const base64 = btoa(bin);
      attachments.push({
        filename: path.split("/").pop() ?? "attachment",
        content: base64,
        content_type: file.type || undefined,
      });
    }

    const from = buildFromAddress(org.email_handle, org.name);
    const replyTo = buildReplyToAddress(thread.thread_token);

    const subject = thread.subject.toLowerCase().startsWith("re:")
      ? thread.subject
      : `Re: ${thread.subject}`;

    const htmlBody = `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(body.body_text)}</div>`;

    let resendId: string | null = null;
    let sendError: string | null = null;
    try {
      const r = await sendEmail({
        from,
        to: toEmails,
        reply_to: replyTo,
        subject,
        text: body.body_text,
        html: htmlBody,
        attachments: attachments.length ? attachments : undefined,
      });
      resendId = r.id;
    } catch (e) {
      sendError = e instanceof Error ? e.message : String(e);
    }

    // Persist message
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        organization_id: thread.organization_id,
        direction: "out",
        from_email: `${org.email_handle}@fireopshq.com`,
        from_name: org.name,
        to_emails: toEmails,
        subject,
        body_text: body.body_text,
        body_html_sanitized: htmlBody,
        resend_message_id: resendId,
        sent_by_user_id: userId,
        send_status: sendError ? "failed" : "sent",
        send_error: sendError,
        sent_at: sendError ? null : new Date().toISOString(),
      })
      .select("id")
      .single();
    if (msgErr) return json({ error: msgErr.message }, 500);

    // Persist attachment metadata
    for (const path of body.attachment_paths ?? []) {
      await supabase.from("message_attachments").insert({
        message_id: msg.id,
        organization_id: thread.organization_id,
        storage_path: path,
        file_name: path.split("/").pop() ?? "attachment",
      });
    }

    // Update thread timestamps
    await supabase
      .from("communication_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_direction: "out",
      })
      .eq("id", thread.id);

    // Clear user's draft
    await supabase.from("message_drafts").delete()
      .eq("thread_id", thread.id).eq("user_id", userId);

    if (sendError) return json({ error: sendError, message_id: msg.id }, 502);
    return json({ ok: true, message_id: msg.id, resend_id: resendId });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
