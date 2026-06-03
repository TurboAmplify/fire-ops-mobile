import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildFromAddress, MAIL_DOMAIN } from "../_shared/resend.ts";

interface LineItem {
  document_id: string;
  account_debtor: string;
  invoice_number: string;
  invoice_amount: number;
  invoice_date: string;
}

interface SubmitBody {
  incident_id: string;
  document_ids: string[];
  line_items: LineItem[];
  seller: string;
  reserve_percent: number;
  schedule_pdf_url: string; // already uploaded to factoring-documents bucket
  schedule_number: number;
  notes?: string;
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
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = (await req.json()) as SubmitBody;
    if (!body.incident_id || !Array.isArray(body.document_ids) || body.document_ids.length === 0) {
      return json({ error: "incident_id and document_ids required" }, 400);
    }
    if (!body.schedule_pdf_url) return json({ error: "schedule_pdf_url required" }, 400);

    // Load incident → org
    const { data: incident, error: incErr } = await supabase
      .from("incidents")
      .select("id, organization_id, name")
      .eq("id", body.incident_id)
      .maybeSingle();
    if (incErr || !incident) return json({ error: "Incident not found" }, 404);

    // Admin check
    const { data: adminOk } = await supabase.rpc("is_org_admin", {
      _user_id: userId, _org_id: incident.organization_id,
    });
    if (!adminOk) return json({ error: "Not authorized" }, 403);

    // Load factoring settings
    const { data: settings, error: setErr } = await supabase
      .from("org_factoring_settings")
      .select("*")
      .eq("organization_id", incident.organization_id)
      .maybeSingle();
    if (setErr || !settings) return json({ error: "Factoring settings not configured" }, 400);
    if (!settings.factor_contact_email) return json({ error: "Factor contact email missing" }, 400);

    // Load org for sender
    const { data: org } = await supabase
      .from("organizations")
      .select("name, email_handle")
      .eq("id", incident.organization_id)
      .maybeSingle();
    const handle = org?.email_handle || "noreply";
    const from = buildFromAddress(handle, org?.name ?? "FireOps HQ");

    // Load referenced OF-286 documents (service role to bypass RLS quirks)
    const { data: docs, error: docsErr } = await service
      .from("incident_documents")
      .select("id, file_url, file_name, organization_id")
      .in("id", body.document_ids);
    if (docsErr) return json({ error: docsErr.message }, 500);
    const orgDocs = (docs ?? []).filter((d: any) => d.organization_id === incident.organization_id);

    // Build attachments: schedule PDF + each OF-286 PDF
    const attachments: { filename: string; content: string; content_type?: string }[] = [];

    const toBase64 = (bytes: Uint8Array) => {
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    };

    const downloadFromPublicUrl = async (url: string): Promise<Uint8Array | null> => {
      try {
        // factoring-documents/{path}
        const u = new URL(url);
        const parts = u.pathname.split("/storage/v1/object/public/");
        if (parts.length === 2) {
          const [bucket, ...rest] = parts[1].split("/");
          const path = rest.join("/");
          const { data, error } = await service.storage.from(bucket).download(path);
          if (error || !data) {
            // try sign+fetch
            const { data: signed } = await service.storage.from(bucket).createSignedUrl(path, 60);
            if (signed?.signedUrl) {
              const r = await fetch(signed.signedUrl);
              if (r.ok) return new Uint8Array(await r.arrayBuffer());
            }
            return null;
          }
          return new Uint8Array(await data.arrayBuffer());
        }
        const r = await fetch(url);
        if (!r.ok) return null;
        return new Uint8Array(await r.arrayBuffer());
      } catch (e) {
        console.warn("download failed:", url, e);
        return null;
      }
    };

    const scheduleBytes = await downloadFromPublicUrl(body.schedule_pdf_url);
    if (!scheduleBytes) return json({ error: "Could not load schedule PDF" }, 500);
    attachments.push({
      filename: `Schedule-${body.schedule_number}.pdf`,
      content: toBase64(scheduleBytes),
      content_type: "application/pdf",
    });

    for (const d of orgDocs) {
      const bytes = await downloadFromPublicUrl(d.file_url);
      if (!bytes) {
        console.warn("Skipping unreadable OF-286 doc:", d.id);
        continue;
      }
      attachments.push({
        filename: d.file_name || `OF-286-${d.id}.pdf`,
        content: toBase64(bytes),
        content_type: "application/pdf",
      });
    }

    // Totals
    const total = body.line_items.reduce((s, li) => s + (Number(li.invoice_amount) || 0), 0);
    const reserve = total * (Number(body.reserve_percent) / 100);
    const fmt = (n: number) =>
      n.toLocaleString("en-US", { style: "currency", currency: "USD" });

    const recipient = settings.factor_contact_email as string;
    const recipientName = (settings.factor_contact_name as string) || "";
    const factorCompany = (settings.factor_company_name as string) || "WideQ Financial LLC";

    const subject = `Schedule #${body.schedule_number} — ${incident.name ?? "Incident"} — ${org?.name ?? ""}`;
    const textBody = `Hi ${recipientName || "there"},

Attached is Schedule of Accounts #${body.schedule_number} for ${incident.name ?? "incident"} along with the signed OF-286(s).

Seller: ${body.seller}
Accounts sold: ${body.line_items.length}
Total amount sold: ${fmt(total)}
Reserve (${body.reserve_percent}%): ${fmt(reserve)}

${body.notes ? body.notes + "\n\n" : ""}Thanks,
${org?.name ?? "FireOps HQ"}`;

    const htmlBody = `<div style="font-family:system-ui,sans-serif;">
      <p>Hi ${escapeHtml(recipientName || "there")},</p>
      <p>Attached is <strong>Schedule of Accounts #${body.schedule_number}</strong> for
      <strong>${escapeHtml(incident.name ?? "incident")}</strong> along with the signed OF-286(s).</p>
      <table style="border-collapse:collapse;">
        <tr><td><strong>Seller</strong></td><td>${escapeHtml(body.seller)}</td></tr>
        <tr><td><strong>Accounts sold</strong></td><td>${body.line_items.length}</td></tr>
        <tr><td><strong>Total amount sold</strong></td><td>${fmt(total)}</td></tr>
        <tr><td><strong>Reserve (${body.reserve_percent}%)</strong></td><td>${fmt(reserve)}</td></tr>
      </table>
      ${body.notes ? `<p>${escapeHtml(body.notes)}</p>` : ""}
      <p>Thanks,<br/>${escapeHtml(org?.name ?? "FireOps HQ")}</p>
    </div>`;

    let resendId: string | null = null;
    try {
      const r = await sendEmail({
        from,
        to: [recipient],
        subject,
        text: textBody,
        html: htmlBody,
        attachments,
      });
      resendId = r.id;
    } catch (sendErr) {
      console.error("Resend send failed:", sendErr);
      return json({ error: sendErr instanceof Error ? sendErr.message : "Send failed" }, 502);
    }

    // Record the submission and bump next_schedule_number
    const { data: inserted, error: insErr } = await service
      .from("factoring_submissions")
      .insert({
        organization_id: incident.organization_id,
        incident_id: body.incident_id,
        schedule_number: body.schedule_number,
        total_amount: total,
        reserve_amount: reserve,
        reserve_percent: body.reserve_percent,
        account_count: body.line_items.length,
        recipient_email: recipient,
        recipient_name: recipientName || null,
        factor_company_name: factorCompany,
        seller: body.seller,
        pdf_url: body.schedule_pdf_url,
        document_ids: body.document_ids,
        line_items: body.line_items,
        submitted_by_user_id: userId,
        submitted_by_name: userEmail,
        email_message_id: resendId,
        notes: body.notes ?? null,
      })
      .select()
      .single();
    if (insErr) {
      console.error("factoring_submissions insert error:", insErr);
    }

    await service
      .from("org_factoring_settings")
      .update({ next_schedule_number: body.schedule_number + 1 })
      .eq("organization_id", incident.organization_id);

    return json({ ok: true, submission: inserted, message_id: resendId });
  } catch (e) {
    console.error("send-factoring-submission error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "\"" ? "&quot;" : "&#39;",
  );
}
