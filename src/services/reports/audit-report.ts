import { supabase } from "@/integrations/supabase/client";

export type AuditKind = "shift_ticket" | "payroll_adjustment" | "platform";

export interface AuditRow {
  id: string;
  occurred_at: string;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
}

interface FetchOpts {
  organizationId?: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  limit?: number;
}

function iso(d: Date | null) { return d ? d.toISOString() : null; }

export async function fetchAuditRows(kind: AuditKind, opts: FetchOpts): Promise<AuditRow[]> {
  const limit = opts.limit ?? 1000;

  if (kind === "shift_ticket") {
    if (!opts.organizationId) return [];
    let q = supabase
      .from("shift_ticket_audit")
      .select("id, occurred_at, actor_name, event_type, field_name, old_value, new_value, reason, shift_ticket_id")
      .eq("organization_id", opts.organizationId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (opts.rangeStart) q = q.gte("occurred_at", iso(opts.rangeStart)!);
    if (opts.rangeEnd) q = q.lte("occurred_at", iso(opts.rangeEnd)!);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      occurred_at: r.occurred_at,
      actor: r.actor_name ?? "Unknown",
      action: r.event_type + (r.field_name ? ` · ${r.field_name}` : ""),
      target: `Ticket ${String(r.shift_ticket_id).slice(0, 8)}`,
      detail: r.reason || (r.old_value || r.new_value ? `${r.old_value ?? ""} → ${r.new_value ?? ""}` : ""),
    }));
  }

  if (kind === "payroll_adjustment") {
    if (!opts.organizationId) return [];
    let q = supabase
      .from("payroll_adjustment_audit")
      .select("id, occurred_at, actor_user_id, event_type, payload, crew_member_id, incident_id")
      .eq("organization_id", opts.organizationId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (opts.rangeStart) q = q.gte("occurred_at", iso(opts.rangeStart)!);
    if (opts.rangeEnd) q = q.lte("occurred_at", iso(opts.rangeEnd)!);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      occurred_at: r.occurred_at,
      actor: r.actor_user_id ? String(r.actor_user_id).slice(0, 8) : "system",
      action: r.event_type,
      target: r.crew_member_id ? `Crew ${String(r.crew_member_id).slice(0, 8)}` : undefined,
      detail: r.payload ? JSON.stringify(r.payload) : "",
    }));
  }

  // platform admin audit
  let q = supabase
    .from("platform_admin_audit")
    .select("id, occurred_at, actor_user_id, action, target_type, target_id, reason")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (opts.rangeStart) q = q.gte("occurred_at", iso(opts.rangeStart)!);
  if (opts.rangeEnd) q = q.lte("occurred_at", iso(opts.rangeEnd)!);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    occurred_at: r.occurred_at,
    actor: String(r.actor_user_id).slice(0, 8),
    action: r.action,
    target: r.target_type ? `${r.target_type}${r.target_id ? ` · ${String(r.target_id).slice(0, 8)}` : ""}` : undefined,
    detail: r.reason ?? "",
  }));
}
