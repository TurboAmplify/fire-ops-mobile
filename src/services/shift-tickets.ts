import { supabase } from "@/integrations/supabase/client";

export interface EquipmentEntry {
  date: string;
  start: string;
  stop: string;
  total: number;
  quantity: string;
  type: string;
  remarks: string;
}

export interface PersonnelEntry {
  date: string;
  operator_name: string;
  op_start: string;
  op_stop: string;
  sb_start: string;
  sb_stop: string;
  total: number;
  remarks: string;
  activity_type?: "travel" | "work";
  work_context?: string;
  lodging?: boolean;
  per_diem_b?: boolean;
  per_diem_l?: boolean;
  per_diem_d?: boolean;
  /** Optional lunch break time (HH:MM). When set, op/sb columns represent the
   *  pre-lunch and post-lunch segments of a single shift. */
  lunch_time?: string;
}

export function buildRemarksString(entry: PersonnelEntry): string {
  const parts: string[] = [];
  if (entry.activity_type === "travel") {
    parts.push("Travel/Check-In");
  } else {
    const ctx = entry.work_context?.trim();
    parts.push(ctx ? `Work - ${ctx}` : "Work");
  }

  if (entry.lodging) parts.push("Lodging");
  const meals: string[] = [];
  if (entry.per_diem_b) meals.push("B");
  if (entry.per_diem_l) meals.push("L");
  if (entry.per_diem_d) meals.push("D");
  if (meals.length > 0) parts.push(`Per Diem (${meals.join(", ")})`);
  return parts.join(", ");
}

export interface ShiftTicket {
  id: string;
  incident_truck_id: string;
  resource_order_id: string | null;
  organization_id: string | null;
  status: string;
  agreement_number: string | null;
  contractor_name: string | null;
  resource_order_number: string | null;
  incident_name: string | null;
  incident_number: string | null;
  financial_code: string | null;
  equipment_make_model: string | null;
  equipment_type: string | null;
  serial_vin_number: string | null;
  license_id_number: string | null;
  transport_retained: boolean | null;
  is_first_last: boolean | null;
  first_last_type: string | null;
  miles: number | null;
  equipment_entries: EquipmentEntry[];
  personnel_entries: PersonnelEntry[];
  remarks: string | null;
  contractor_rep_name: string | null;
  contractor_rep_signature_url: string | null;
  contractor_rep_signed_at: string | null;
  supervisor_name: string | null;
  supervisor_resource_order: string | null;
  supervisor_signature_url: string | null;
  supervisor_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchShiftTickets(incidentTruckId: string): Promise<ShiftTicket[]> {
  const { data, error } = await supabase
    .from("shift_tickets")
    .select("*")
    .eq("incident_truck_id", incidentTruckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ShiftTicket[];
}

export async function duplicateShiftTicket(
  sourceTicket: ShiftTicket,
  organizationId: string
): Promise<ShiftTicket> {
  // M2-M8: Advance dates by 1 day using UTC arithmetic to avoid DST shifts
  const advanceDate = (dateStr: string) => {
    if (!dateStr) return dateStr;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  const newEquipment = (sourceTicket.equipment_entries as EquipmentEntry[]).map((e) => ({
    ...e,
    date: advanceDate(e.date),
  }));
  // Use the first equipment entry date as source of truth for personnel dates
  const personnelDate = newEquipment.length > 0 ? newEquipment[0].date : advanceDate((sourceTicket.personnel_entries as PersonnelEntry[])[0]?.date || "");
  const newPersonnel = (sourceTicket.personnel_entries as PersonnelEntry[]).map((p) => ({
    ...p,
    date: personnelDate,
  }));

  const { id, created_at, updated_at, contractor_rep_signature_url, contractor_rep_signed_at, supervisor_signature_url, supervisor_signed_at, ...rest } = sourceTicket;

  const { data, error } = await supabase
    .from("shift_tickets")
    .insert({
      ...rest,
      organization_id: organizationId,
      equipment_entries: newEquipment as any,
      personnel_entries: newPersonnel as any,
      status: "draft",
      contractor_rep_signature_url: null,
      contractor_rep_signed_at: null,
      supervisor_signature_url: null,
      supervisor_signed_at: null,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ShiftTicket;
}

export async function fetchShiftTicket(id: string): Promise<ShiftTicket | null> {
  const { data, error } = await supabase
    .from("shift_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ShiftTicket | null;
}

export async function createShiftTicket(ticket: Partial<ShiftTicket> & { incident_truck_id: string; organization_id: string }): Promise<ShiftTicket> {
  const { data, error } = await supabase
    .from("shift_tickets")
    .insert(ticket as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ShiftTicket;
}

export async function updateShiftTicket(id: string, updates: Partial<ShiftTicket>): Promise<void> {
  const { error } = await supabase
    .from("shift_tickets")
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShiftTicket(id: string): Promise<void> {
  const { error } = await supabase
    .from("shift_tickets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export interface SignatureAuditEntry {
  shift_ticket_id: string;
  organization_id: string | null;
  signer_type: "contractor" | "supervisor";
  signer_name: string | null;
  signature_url: string;
  method: "typed" | "drawn";
  font_used?: string | null;
  user_id?: string | null;
}

export async function insertSignatureAuditLog(entry: SignatureAuditEntry): Promise<void> {
  const { error } = await supabase.from("signature_audit_log" as any).insert(entry as any);
  if (error) {
    console.error("Failed to insert signature audit log:", error);
    // Don't throw — audit log failure shouldn't block signature save
  }
}

export async function uploadSignature(file: Blob, ticketId: string, type: "contractor" | "supervisor"): Promise<string> {
  const path = `${ticketId}/${type}-${Date.now()}.png`;
  const { error } = await supabase.storage.from("signatures").upload(path, file, { contentType: "image/png" });
  if (error) throw error;
  const { data } = supabase.storage.from("signatures").getPublicUrl(path);
  return data.publicUrl;
}

export function computeHours(start: string, stop: string): number {
  if (!start || !stop) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = stop.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

/**
 * Add minutes to an HH:MM time string. Wraps at 24h.
 * Returns "" for invalid input.
 */
export function addMinutes(time: string, mins: number): string {
  if (!time || !time.includes(":")) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Normalize lunch time to HH:MM. Accepts "1200", "12:00", "12", etc.
 */
export function normalizeLunchTime(input: string): string {
  if (!input) return "";
  if (input.includes(":")) {
    const [h, m] = input.split(":");
    return `${(h || "0").padStart(2, "0")}:${(m || "0").padStart(2, "0")}`;
  }
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `${digits.padStart(2, "0")}:00`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1, 3)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/**
 * Split an op_start → op_stop window into two segments around a lunch break.
 * Returns op (start → lunch) and sb (lunch+30 → original stop).
 * If lunch is outside the window, returns the original window with empty SB.
 */
export function splitForLunch(
  start: string,
  stop: string,
  lunchTime: string,
  lunchDurationMin = 30
): { op_start: string; op_stop: string; sb_start: string; sb_stop: string } {
  if (!start || !stop || !lunchTime) {
    return { op_start: start, op_stop: stop, sb_start: "", sb_stop: "" };
  }
  const lunchEnd = addMinutes(lunchTime, lunchDurationMin);
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const sMin = toMin(start);
  const eMinRaw = toMin(stop);
  const eMin = eMinRaw < sMin ? eMinRaw + 24 * 60 : eMinRaw;
  let lMin = toMin(lunchTime);
  if (lMin < sMin) lMin += 24 * 60;
  // Lunch must fall strictly inside the window
  if (lMin <= sMin || lMin + lunchDurationMin >= eMin) {
    return { op_start: start, op_stop: stop, sb_start: "", sb_stop: "" };
  }
  return {
    op_start: start,
    op_stop: lunchTime,
    sb_start: lunchEnd,
    sb_stop: stop,
  };
}
