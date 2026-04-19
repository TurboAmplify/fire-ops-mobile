import { supabase } from "@/integrations/supabase/client";

/**
 * Append-only audit trail for shift tickets.
 *
 * The `shift_ticket_audit` table has RLS that allows INSERT + SELECT for org
 * members, and explicitly NO UPDATE / DELETE policies. A trigger also blocks
 * any UPDATE/DELETE attempt, making the trail tamper-evident.
 */

export type ShiftTicketAuditEvent =
  | "field_change"
  | "signature_captured"
  | "signature_cleared"
  | "locked"
  | "unlocked"
  | "relocked"
  | "override_edit";

export interface ShiftTicketAuditEntry {
  id: string;
  shift_ticket_id: string;
  organization_id: string;
  event_type: ShiftTicketAuditEvent;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  occurred_at: string;
}

export interface AuditWriteInput {
  shift_ticket_id: string;
  organization_id: string;
  event_type: ShiftTicketAuditEvent;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  actor_user_id?: string | null;
  actor_name?: string | null;
}

export async function fetchShiftTicketAudit(
  shiftTicketId: string
): Promise<ShiftTicketAuditEntry[]> {
  const { data, error } = await supabase
    .from("shift_ticket_audit" as any)
    .select("*")
    .eq("shift_ticket_id", shiftTicketId)
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ShiftTicketAuditEntry[];
}

export async function insertAuditEntries(entries: AuditWriteInput[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase
    .from("shift_ticket_audit" as any)
    .insert(entries as any);
  if (error) {
    // Audit write failure must NOT block the user's save flow, but we log loudly.
    console.error("Failed to write shift ticket audit entries:", error, entries);
  }
}

/* ─────────────────────── Diffing helpers ─────────────────────── */

const TRACKED_SCALAR_FIELDS: Array<{ key: string; label: string }> = [
  { key: "agreement_number", label: "Agreement #" },
  { key: "contractor_name", label: "Contractor" },
  { key: "resource_order_number", label: "Resource order #" },
  { key: "incident_name", label: "Incident name" },
  { key: "incident_number", label: "Incident #" },
  { key: "financial_code", label: "Financial code" },
  { key: "equipment_make_model", label: "Equipment make/model" },
  { key: "equipment_type", label: "Equipment type" },
  { key: "serial_vin_number", label: "Serial / VIN" },
  { key: "license_id_number", label: "License / ID" },
  { key: "transport_retained", label: "Transport retained" },
  { key: "is_first_last", label: "First/Last shift" },
  { key: "first_last_type", label: "First/Last type" },
  { key: "miles", label: "Miles" },
  { key: "remarks", label: "Remarks" },
  { key: "contractor_rep_name", label: "Contractor rep name" },
  { key: "supervisor_name", label: "Supervisor name" },
  { key: "supervisor_resource_order", label: "Supervisor RO #" },
];

function norm(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Compare an existing ticket to the next save payload and return audit
 * entries for every changed scalar field plus structural diffs on the
 * equipment/personnel arrays (length only, plus a per-row count summary).
 */
export function diffTicket(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Array<Pick<AuditWriteInput, "event_type" | "field_name" | "old_value" | "new_value">> {
  const out: Array<Pick<AuditWriteInput, "event_type" | "field_name" | "old_value" | "new_value">> = [];

  for (const { key, label } of TRACKED_SCALAR_FIELDS) {
    const a = norm(before[key]);
    const b = norm(after[key]);
    if (a !== b) {
      out.push({
        event_type: "field_change",
        field_name: label,
        old_value: a || null,
        new_value: b || null,
      });
    }
  }

  // Array-shaped fields: log a single summary entry if the JSON differs.
  for (const key of ["equipment_entries", "personnel_entries"] as const) {
    const a = norm(before[key]);
    const b = norm(after[key]);
    if (a !== b) {
      const beforeArr = Array.isArray(before[key]) ? (before[key] as unknown[]) : [];
      const afterArr = Array.isArray(after[key]) ? (after[key] as unknown[]) : [];
      out.push({
        event_type: "field_change",
        field_name:
          key === "equipment_entries" ? "Equipment entries" : "Personnel entries",
        old_value: `${beforeArr.length} entries`,
        new_value: `${afterArr.length} entries (edited)`,
      });
    }
  }

  return out;
}

/**
 * Returns true if either signature is present on the BEFORE state.
 * Field-level audit logging only kicks in once a signature exists.
 */
export function hasAnySignature(ticket: Record<string, unknown>): boolean {
  return !!(ticket.contractor_rep_signature_url || ticket.supervisor_signature_url);
}

/**
 * Returns true if the supervisor signature is present (the lock condition).
 */
export function isLocked(ticket: Record<string, unknown>): boolean {
  return !!ticket.supervisor_signature_url;
}
