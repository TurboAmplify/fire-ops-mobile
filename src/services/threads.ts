import { supabase } from "@/integrations/supabase/client";

export type ThreadPurpose = "general" | "shift_ticket" | "demob" | "of286" | "red_cards";

export interface ThreadRow {
  id: string;
  organization_id: string;
  incident_id: string | null;
  incident_truck_id: string | null;
  subject: string;
  purpose: ThreadPurpose | string;
  status: string;
  thread_token: string;
  contact_id: string | null;
  finance_officer_id: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_direction: string | null;
  created_at: string;
}

export type Of286Stage = "review" | "original" | "finance_signed" | "signed";

export interface ThreadListItem extends ThreadRow {
  incident_name: string | null;
  last_snippet: string | null;
  counterparty_name: string | null;
  counterparty_email: string | null;
  attachment_count: number;
  needs_signature: boolean;
  /** Latest OF-286 doc stage on this thread, if any. */
  of286_stage: Of286Stage | null;
}


export interface MessageRow {
  id: string;
  thread_id: string;
  organization_id: string;
  direction: "in" | "out" | string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  body_text: string | null;
  body_html_sanitized: string | null;
  send_status: string;
  send_error: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  is_system: boolean;
}

export interface AttachmentRow {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  auto_classified_as: string | null;
  auto_classified_stage: string | null;
  linked_incident_document_id: string | null;
}

export async function listThreads(opts: {
  organizationId: string;
  incidentId?: string;
}): Promise<ThreadListItem[]> {
  let q = supabase
    .from("communication_threads")
    .select("*, incidents(name)")
    .eq("organization_id", opts.organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (opts.incidentId) {
    // Match threads tied to the incident directly OR via an incident_truck that
    // belongs to this incident (red-card / shift-ticket threads sometimes only
    // carry incident_truck_id).
    const { data: itRows } = await supabase
      .from("incident_trucks")
      .select("id")
      .eq("incident_id", opts.incidentId);
    const truckIds = (itRows ?? []).map((r) => r.id);
    if (truckIds.length > 0) {
      q = q.or(`incident_id.eq.${opts.incidentId},incident_truck_id.in.(${truckIds.join(",")})`);
    } else {
      q = q.eq("incident_id", opts.incidentId);
    }
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Array<ThreadRow & { incidents?: { name: string } | null }>;
  if (rows.length === 0) return [];

  // Defensive client-side filter for incident scope.
  const scoped = opts.incidentId
    ? rows.filter((r) => r.incident_id === opts.incidentId || !!r.incident_truck_id)
    : rows;

  // Fetch the last message per thread (cheap: bounded list of ids).
  const ids = scoped.map((r) => r.id);
  const { data: lastMsgs } = await supabase
    .from("messages")
    .select("thread_id, body_text, from_email, from_name, direction, created_at")
    .in("thread_id", ids)
    .order("created_at", { ascending: false });
  const snippetByThread = new Map<string, { snippet: string; from_email: string; from_name: string | null }>();
  for (const m of lastMsgs ?? []) {
    if (snippetByThread.has(m.thread_id)) continue;
    snippetByThread.set(m.thread_id, {
      snippet: (m.body_text ?? "").slice(0, 140),
      from_email: m.from_email,
      from_name: m.from_name,
    });
  }

  // Attachment counts per thread.
  const attachmentCount = new Map<string, number>();
  const { data: attRows } = await supabase
    .from("message_attachments")
    .select("id, messages!inner(thread_id)")
    .in("messages.thread_id", ids);
  for (const a of (attRows ?? []) as Array<{ messages: { thread_id: string } | null }>) {
    const tid = a.messages?.thread_id;
    if (!tid) continue;
    attachmentCount.set(tid, (attachmentCount.get(tid) ?? 0) + 1);
  }

  // OF-286 docs linked to these threads — pick the latest per thread.
  const { data: docRows } = await supabase
    .from("incident_documents")
    .select("thread_id, document_type, signed_at, stage, created_at")
    .in("thread_id", ids)
    .eq("document_type", "of286")
    .order("created_at", { ascending: false });
  const latestDocByThread = new Map<string, { stage: string | null; signed_at: string | null }>();
  for (const d of (docRows ?? []) as Array<{ thread_id: string | null; signed_at: string | null; stage: string | null }>) {
    if (!d.thread_id) continue;
    if (latestDocByThread.has(d.thread_id)) continue;
    latestDocByThread.set(d.thread_id, { stage: d.stage, signed_at: d.signed_at });
  }

  return scoped.map((r) => {
    const last = snippetByThread.get(r.id);
    const doc = latestDocByThread.get(r.id) ?? null;
    const stage = (doc?.stage ?? null) as Of286Stage | null;
    // Needs-signature pill ONLY fires for stage='original' (sign-and-return)
    // that hasn't been signed yet. Review-only drafts never trigger it.
    const needs = !!doc && stage === "original" && !doc.signed_at;
    return {
      ...r,
      incident_name: r.incidents?.name ?? null,
      last_snippet: last?.snippet ?? null,
      counterparty_name: last?.from_name ?? null,
      counterparty_email: last?.from_email ?? null,
      attachment_count: attachmentCount.get(r.id) ?? 0,
      needs_signature: needs,
      of286_stage: stage,
    };
  });
}


export async function getThread(threadId: string): Promise<{
  thread: ThreadRow;
  messages: MessageRow[];
  attachmentsByMessage: Record<string, AttachmentRow[]>;
}> {
  const { data: thread, error: tErr } = await supabase
    .from("communication_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!thread) throw new Error("Thread not found");

  const { data: messages, error: mErr } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (mErr) throw mErr;

  const msgIds = (messages ?? []).map((m) => m.id);
  const attMap: Record<string, AttachmentRow[]> = {};
  if (msgIds.length) {
    const { data: atts } = await supabase
      .from("message_attachments")
      .select("*")
      .in("message_id", msgIds);
    for (const a of atts ?? []) {
      (attMap[a.message_id] ||= []).push(a as AttachmentRow);
    }
  }
  return {
    thread: thread as ThreadRow,
    messages: (messages ?? []) as MessageRow[],
    attachmentsByMessage: attMap,
  };
}

export async function markThreadRead(threadId: string): Promise<void> {
  await supabase
    .from("communication_threads")
    .update({ unread_count: 0 })
    .eq("id", threadId);
}

export async function unreadTotal(organizationId: string): Promise<number> {
  const { data, error } = await supabase
    .from("communication_threads")
    .select("unread_count")
    .eq("organization_id", organizationId);
  if (error) return 0;
  return (data ?? []).reduce((s, r) => s + (r.unread_count ?? 0), 0);
}

function generateToken(): string {
  // 24-char url-safe token
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, "").slice(0, 24);
}

export async function createThread(input: {
  organizationId: string;
  incidentId?: string | null;
  incidentTruckId?: string | null;
  contactId?: string | null;
  financeOfficerId?: string | null;
  purpose: ThreadPurpose;
  subject: string;
  createdByUserId?: string | null;
}): Promise<ThreadRow> {
  const { data, error } = await supabase
    .from("communication_threads")
    .insert({
      organization_id: input.organizationId,
      incident_id: input.incidentId ?? null,
      incident_truck_id: input.incidentTruckId ?? null,
      contact_id: input.contactId ?? null,
      finance_officer_id: input.financeOfficerId ?? null,
      purpose: input.purpose,
      subject: input.subject,
      thread_token: generateToken(),
      status: "open",
      created_by_user_id: input.createdByUserId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ThreadRow;
}

export async function getDraft(threadId: string, userId: string): Promise<string> {
  const { data } = await supabase
    .from("message_drafts")
    .select("body_text")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.body_text ?? "";
}

export async function saveDraft(threadId: string, userId: string, organizationId: string, body: string): Promise<void> {
  if (!body.trim()) {
    await supabase.from("message_drafts").delete()
      .eq("thread_id", threadId).eq("user_id", userId);
    return;
  }
  await supabase.from("message_drafts").upsert(
    {
      thread_id: threadId,
      user_id: userId,
      organization_id: organizationId,
      body_text: body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" } as never,
  );
}

export async function sendReply(
  threadId: string,
  bodyText: string,
  attachmentPaths?: string[],
  source?: {
    incidentId?: string | null;
    incidentTruckId?: string | null;
    documentLabel?: string;
  },
): Promise<{ message_id: string }> {
  const { data, error } = await supabase.functions.invoke("send-thread-reply", {
    body: {
      thread_id: threadId,
      body_text: bodyText,
      attachment_paths: attachmentPaths && attachmentPaths.length ? attachmentPaths : undefined,
      source_incident_id: source?.incidentId ?? undefined,
      source_incident_truck_id: source?.incidentTruckId ?? undefined,
      source_document_label: source?.documentLabel ?? undefined,
    },
  });
  if (error) throw error;
  if (data?.error) {
    const err = new Error(data.detail || data.error) as Error & { code?: string };
    err.code = data.error;
    throw err;
  }
  return data as { message_id: string };
}

