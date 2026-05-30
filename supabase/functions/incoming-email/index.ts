// Inbound email webhook (Resend) -> append to thread + AI classify attachments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { parseReplyToken } from "../_shared/tokens.ts";

interface ResendInboundAttachment {
  id?: string;
  filename: string;
  content_type: string;
  content_base64?: string;
  url?: string;
  download_url?: string;
}

interface ResendInbound {
  email_id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
  in_reply_to?: string;
  references?: string[];
  attachments?: ResendInboundAttachment[];
}

interface NormalizedAttachment {
  id?: string;
  filename: string;
  content_type: string;
  base64: string;
  size?: number;
}

Deno.serve(async (req) => {
  try {
    const raw = (await req.json()) as Record<string, unknown>;
    // Resend wraps inbound as { type: "email.received", data: { ... } }.
    const payload = ((raw?.data ?? raw) as ResendInbound) ?? {};
    const evtType = typeof raw?.type === "string" ? (raw.type as string) : "";
    if (evtType && evtType !== "email.received") {
      return json({ ok: true, skipped: `event_${evtType}` });
    }

    // Service-role client (webhook is unauthenticated)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Collect all recipient addresses (to + cc).
    const recipients: string[] = [
      ...(payload.to ?? []),
      ...(payload.cc ?? []),
    ].filter(Boolean);

    // 1) Try to identify thread by reply+<token>@...
    let token: string | null = null;
    for (const addr of recipients) {
      token = parseReplyToken(addr);
      if (token) break;
    }

    let thread: {
      id: string;
      organization_id: string;
      subject: string | null;
      incident_truck_id: string | null;
      purpose: string | null;
    } | null = null;

    if (token) {
      const { data } = await supabase
        .from("communication_threads")
        .select("id, organization_id, subject, incident_truck_id, purpose")
        .eq("thread_token", token)
        .maybeSingle();
      thread = data ?? null;
    }

    // 2) Fallback: route by org email handle (<handle>@fireopshq.com).
    // Look up the organization whose email_handle matches one of the recipient
    // prefixes, then open (or reuse) a generic "inbox" thread for that org.
    if (!thread) {
      const handles = recipients
        .map((a) => extractEmail(a)?.toLowerCase() ?? "")
        .filter((e) => e.endsWith("@fireopshq.com") && !e.startsWith("reply+"))
        .map((e) => e.split("@")[0]);

      if (handles.length > 0) {
        // 1) Exact match
        let { data: org } = await supabase
          .from("organizations")
          .select("id, email_handle")
          .in("email_handle", handles)
          .maybeSingle();

        // 2) Tolerant prefix match — sometimes the stored handle and the
        // address the reply was sent to differ by a few trailing chars
        // (handle truncation differences). Accept when either is a prefix
        // of the other and share at least 8 chars.
        if (!org) {
          for (const h of handles) {
            if (h.length < 8) continue;
            const stem = h.slice(0, Math.max(8, h.length - 4));
            const { data: rows } = await supabase
              .from("organizations")
              .select("id, email_handle")
              .ilike("email_handle", `${stem}%`)
              .limit(5);
            const candidate = (rows ?? []).find((r) => {
              const eh = (r.email_handle ?? "").toLowerCase();
              return eh.startsWith(h) || h.startsWith(eh);
            });
            if (candidate) {
              org = candidate;
              break;
            }
          }
        }

        if (org) {
          const fromAddr =
            extractEmail(payload.from ?? "")?.toLowerCase() ?? "unknown";
          const subj = (payload.subject ?? "(no subject)").trim();
          // Try to reuse a recent general inbox thread on same subject; else open new.
          const { data: existing } = await supabase
            .from("communication_threads")
            .select("id, organization_id, subject, incident_truck_id, purpose")
            .eq("organization_id", org.id)
            .eq("purpose", "general")
            .eq("subject", subj)
            .order("last_message_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existing) {
            thread = existing;
          } else {
            const newToken = crypto.randomUUID().replace(/-/g, "");
            const { data: created, error: cErr } = await supabase
              .from("communication_threads")
              .insert({
                organization_id: org.id,
                purpose: "general",
                subject: subj,
                thread_token: newToken,
                status: "open",
                last_message_at: new Date().toISOString(),
                last_message_direction: "in",
                unread_count: 0,
              })
              .select("id, organization_id, subject, incident_truck_id, purpose")
              .single();
            if (cErr) {
              console.error("incoming-email: failed to open inbox thread", cErr);
            }
            thread = created ?? null;
          }
          console.log(
            `incoming-email: routed by handle ${org.email_handle} from ${fromAddr}`,
          );
        }
      }
    }


    if (!thread) {
      console.log("incoming-email: no thread match, dropping", { recipients });
      return json({ ok: true, skipped: "no_thread_match" });
    }


    const subject = payload.subject ?? thread.subject;
    const fromEmail = extractEmail(payload.from ?? "") ?? "unknown@unknown";
    const fromName = extractName(payload.from ?? "");

    const sanitizedHtml = sanitizeHtml(payload.html ?? "");

    // Insert inbound message
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        organization_id: thread.organization_id,
        direction: "in",
        from_email: fromEmail,
        from_name: fromName,
        to_emails: payload.to ?? [],
        cc_emails: payload.cc ?? [],
        subject,
        body_text: payload.text ?? null,
        body_html_sanitized: sanitizedHtml,
        resend_message_id: payload.message_id ?? null,
        in_reply_to: payload.in_reply_to ?? null,
        message_references: payload.references ?? [],
        send_status: "received",
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (msgErr || !msg) {
      console.error("Failed to insert inbound message", msgErr);
      return json({ ok: false, error: msgErr?.message }, 500);
    }

    // Persist + classify attachments. Resend receiving webhooks only include
    // attachment metadata; fetch the actual files from Resend before storing.
    const classifications: unknown[] = [];
    const inboundAttachments = await loadInboundAttachments(payload);
    for (const att of inboundAttachments) {
      const base64 = att.base64;
      const path = `${thread.organization_id}/${thread.id}/${msg.id}/${sanitizeFilename(att.filename)}`;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabase.storage
        .from("communication-attachments")
        .upload(path, bytes, { contentType: att.content_type, upsert: false });
      if (upErr) {
        console.error("Attachment upload failed", upErr);
        continue;
      }

      let classified: { type: string; stage?: string; confidence: number; model: string } | null = null;
      if ((att.content_type === "application/pdf" || att.filename.toLowerCase().endsWith(".pdf"))) {
        try {
          classified = await classifyPdf(att.filename, base64);
        } catch (e) {
          console.error("AI classify failed", e);
        }
      }

      const { data: maRow } = await supabase
        .from("message_attachments")
        .insert({
          message_id: msg.id,
          organization_id: thread.organization_id,
          storage_path: path,
          file_name: att.filename,
          mime_type: att.content_type,
          size_bytes: att.size ?? bytes.length,
          auto_classified_as: classified?.type ?? null,
          auto_classified_stage: classified?.stage ?? null,
          classification_confidence: classified?.confidence ?? null,
          classification_model: classified?.model ?? null,
        })
        .select("id")
        .single();
      classifications.push({ attachment_id: maRow?.id, ...classified });

      // Auto-attach high-confidence OF-286 drafts
      if (
        classified &&
        classified.type === "of286" &&
        classified.confidence >= 0.8 &&
        thread.incident_truck_id
      ) {
        const { data: it } = await supabase
          .from("incident_trucks")
          .select("incident_id")
          .eq("id", thread.incident_truck_id)
          .maybeSingle();
        if (it?.incident_id) {
          await supabase.from("incident_documents").insert({
            incident_id: it.incident_id,
            organization_id: thread.organization_id,
            incident_truck_id: thread.incident_truck_id,
            document_type: "of286",
            file_url: path,
            file_name: att.filename,
            stage: classified.stage ?? "of286_draft_received",
            source_message_id: msg.id,
            thread_id: thread.id,
            ai_classification: classified as unknown as Record<string, unknown>,
          });

          await supabase.from("app_notifications").insert({
            organization_id: thread.organization_id,
            type: "of286_received",
            title: "OF-286 received",
            body: `${fromName || fromEmail} sent an OF-286 for your review.`,
            thread_id: thread.id,
            incident_id: it.incident_id,
            incident_truck_id: thread.incident_truck_id,
          });
        }
      }
    }

    // Notify on plain reply (no auto-attach)
    if (!classifications.some((c) => (c as { type?: string })?.type === "of286")) {
      await supabase.from("app_notifications").insert({
        organization_id: thread.organization_id,
        type: "message_received",
        title: "New reply",
        body: `${fromName || fromEmail}: ${(payload.text ?? "").slice(0, 120)}`,
        thread_id: thread.id,
        incident_truck_id: thread.incident_truck_id ?? null,
      });
    }

    // Update thread + bump unread
    const { data: cur } = await supabase
      .from("communication_threads")
      .select("unread_count")
      .eq("id", thread.id)
      .maybeSingle();
    await supabase
      .from("communication_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_direction: "in",
        unread_count: (cur?.unread_count ?? 0) + 1,
      })
      .eq("id", thread.id);

    return json({ ok: true, message_id: msg.id, classifications });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : "err" }, 500);
  }
});

async function classifyPdf(
  filename: string,
  _base64: string,
): Promise<{ type: string; stage?: string; confidence: number; model: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  // Filename-first cheap heuristic; AI confirms.
  const lower = filename.toLowerCase();
  const hint = lower.includes("286")
    ? "of286"
    : lower.includes("297") || lower.includes("shift")
      ? "of297"
      : lower.includes("demob")
        ? "demob"
        : "other";

  // Ask AI gateway to confirm + score
  const model = "google/gemini-2.5-flash-lite";
  const prompt = `You are classifying a PDF email attachment from a wildland-fire incident.
Filename: "${filename}"
Likely type from filename: ${hint}.

Return strict JSON: {"type":"of286|of297|demob|other","stage":"of286_draft_received|of286_finance_signed|null","confidence":0-1}.
OF-286 is "Emergency Equipment Use Invoice". OF-297 is the daily shift ticket. Demob = release/demobilization paperwork.
If type != of286, stage must be null.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    type: parsed.type ?? "other",
    stage: parsed.stage ?? undefined,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    model,
  };
}

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

function extractEmail(s: string): string | null {
  const m = s.match(/<([^>]+)>/) || s.match(/([\w.+-]+@[\w.-]+)/);
  return m ? m[1] : null;
}
function extractName(s: string): string {
  const m = s.match(/^"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : "";
}
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
