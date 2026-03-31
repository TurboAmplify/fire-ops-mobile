import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Shift = Tables<"shifts">;
export type ShiftInsert = TablesInsert<"shifts">;
export type ShiftCrew = Tables<"shift_crew">;

export type ShiftWithRelations = Shift & {
  incident_trucks: {
    id: string;
    incident_id: string;
    trucks: { id: string; name: string; make: string | null; model: string | null; vin: string | null; plate: string | null; unit_type: string | null };
    incidents: { id: string; name: string };
  };
};

export type ShiftCrewEntry = {
  crew_member_id: string;
  hours: number;
  role_on_shift?: string | null;
  notes?: string | null;
  operating_start?: string | null;
  operating_stop?: string | null;
  standby_start?: string | null;
  standby_stop?: string | null;
};

export async function fetchAllShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select("*, incident_trucks!inner(id, incident_id, trucks(id, name, make, model, vin, plate, unit_type), incidents:incidents!incident_trucks_incident_id_fkey(id, name))")
    .order("date", { ascending: false });
  if (error) throw error;
  return data as unknown as ShiftWithRelations[];
}

export async function fetchShifts(incidentTruckId: string) {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("incident_truck_id", incidentTruckId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchShiftWithCrew(shiftId: string) {
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("*, incident_trucks!inner(id, incident_id, trucks(id, name, make, model, vin, plate, unit_type), incidents:incidents!incident_trucks_incident_id_fkey(id, name))")
    .eq("id", shiftId)
    .maybeSingle();
  if (shiftError) throw shiftError;

  const { data: crew, error: crewError } = await supabase
    .from("shift_crew")
    .select("*, crew_members(*)")
    .eq("shift_id", shiftId);
  if (crewError) throw crewError;

  return { shift, crew };
}

export async function createShiftWithCrew(
  shiftData: ShiftInsert,
  crewEntries: ShiftCrewEntry[]
) {
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .insert(shiftData)
    .select()
    .single();
  if (shiftError) throw shiftError;

  if (crewEntries.length > 0) {
    const rows = crewEntries.map((entry) => ({
      shift_id: shift.id,
      crew_member_id: entry.crew_member_id,
      hours: entry.hours,
      role_on_shift: entry.role_on_shift || null,
      notes: entry.notes || null,
      operating_start: entry.operating_start || null,
      operating_stop: entry.operating_stop || null,
      standby_start: entry.standby_start || null,
      standby_stop: entry.standby_stop || null,
    }));

    const { error: crewError } = await supabase
      .from("shift_crew")
      .insert(rows);
    if (crewError) throw crewError;
  }

  return shift;
}
