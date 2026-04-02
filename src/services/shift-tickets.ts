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
  // Advance all dates by 1 day
  const advanceDate = (dateStr: string) => {
    if (!dateStr) return dateStr;
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const newEquipment = (sourceTicket.equipment_entries as EquipmentEntry[]).map((e) => ({
    ...e,
    date: advanceDate(e.date),
  }));
  const newPersonnel = (sourceTicket.personnel_entries as PersonnelEntry[]).map((p) => ({
    ...p,
    date: advanceDate(p.date),
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
