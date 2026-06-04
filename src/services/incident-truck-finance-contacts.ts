import { supabase } from "@/integrations/supabase/client";

export interface IncidentTruckFinanceContact {
  id: string;
  incident_truck_id: string | null;
  incident_id: string | null;
  organization_id: string;
  finance_officer_id: string | null;
  name_override: string | null;
  email_override: string | null;
  phone_override: string | null;
  work_phone_override: string | null;
  cell_phone_override: string | null;
  role: "shift_tickets" | "demob" | "both";
  receives_shift_tickets: boolean;
  receives_demob: boolean;
  receives_red_cards: boolean;
  receives_of286: boolean;
  is_active: boolean;
  notes: string | null;
  selected_at: string;
  /** Joined name from finance_officers when no override is set. */
  finance_officer_name?: string | null;
  /** Joined email from finance_officers when no override is set. */
  finance_officer_email?: string | null;
}

export type DocumentFlagKey =
  | "receives_shift_tickets"
  | "receives_demob"
  | "receives_red_cards"
  | "receives_of286";

/** Display-friendly name: override first, fall back to directory entry. */
export function contactDisplayName(c: IncidentTruckFinanceContact): string {
  return c.name_override?.trim() || c.finance_officer_name?.trim() || "Contact";
}

/** Display-friendly email: override first, fall back to directory entry. */
export function contactDisplayEmail(c: IncidentTruckFinanceContact): string | null {
  return (c.email_override?.trim() || c.finance_officer_email?.trim() || null);
}

function mapRow(row: any): IncidentTruckFinanceContact {
  const fo = (row.finance_officers ?? null) as { name?: string; email?: string } | null;
  return {
    ...row,
    finance_officer_name: fo?.name ?? null,
    finance_officer_email: fo?.email ?? null,
  } as IncidentTruckFinanceContact;
}

export async function listTruckFinanceContacts(
  incidentTruckId: string,
): Promise<IncidentTruckFinanceContact[]> {
  const { data, error } = await supabase
    .from("incident_truck_finance_contacts")
    .select("*, finance_officers(name, email)")
    .eq("incident_truck_id", incidentTruckId)
    .eq("is_active", true)
    .order("selected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listIncidentFinanceContacts(
  incidentId: string,
): Promise<IncidentTruckFinanceContact[]> {
  const { data, error } = await supabase
    .from("incident_truck_finance_contacts")
    .select("*, finance_officers(name, email)")
    .eq("incident_id", incidentId)
    .is("incident_truck_id", null)
    .eq("is_active", true)
    .order("selected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function addTruckFinanceContact(input: {
  incident_truck_id: string;
  organization_id: string;
  finance_officer_id?: string | null;
  name_override?: string;
  email_override?: string;
  phone_override?: string;
  work_phone_override?: string;
  cell_phone_override?: string;
  role?: "shift_tickets" | "demob" | "both";
  notes?: string;
}): Promise<IncidentTruckFinanceContact> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("incident_truck_finance_contacts")
    .insert({
      incident_truck_id: input.incident_truck_id,
      organization_id: input.organization_id,
      finance_officer_id: input.finance_officer_id ?? null,
      name_override: input.name_override || null,
      email_override: input.email_override || null,
      phone_override: input.phone_override || input.cell_phone_override || input.work_phone_override || null,
      work_phone_override: input.work_phone_override || null,
      cell_phone_override: input.cell_phone_override || null,
      role: input.role ?? "both",
      notes: input.notes || null,
      selected_by_user_id: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as IncidentTruckFinanceContact;
}

export async function addIncidentFinanceContact(input: {
  incident_id: string;
  organization_id: string;
  finance_officer_id?: string | null;
  name_override?: string;
  email_override?: string;
  phone_override?: string;
  work_phone_override?: string;
  cell_phone_override?: string;
  role?: "shift_tickets" | "demob" | "both";
  notes?: string;
}): Promise<IncidentTruckFinanceContact> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("incident_truck_finance_contacts")
    .insert({
      incident_id: input.incident_id,
      incident_truck_id: null,
      organization_id: input.organization_id,
      finance_officer_id: input.finance_officer_id ?? null,
      name_override: input.name_override || null,
      email_override: input.email_override || null,
      phone_override: input.phone_override || input.cell_phone_override || input.work_phone_override || null,
      work_phone_override: input.work_phone_override || null,
      cell_phone_override: input.cell_phone_override || null,
      role: input.role ?? "both",
      notes: input.notes || null,
      selected_by_user_id: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as IncidentTruckFinanceContact;
}

export async function removeTruckFinanceContact(id: string): Promise<void> {
  const { error } = await supabase
    .from("incident_truck_finance_contacts")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}
