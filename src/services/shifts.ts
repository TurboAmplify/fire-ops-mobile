import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Shift = Tables<"shifts">;
export type ShiftInsert = TablesInsert<"shifts">;
export type ShiftCrew = Tables<"shift_crew">;

export type ShiftCrewEntry = {
  crew_member_id: string;
  hours: number;
  role_on_shift?: string | null;
  notes?: string | null;
};

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
    .select("*")
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
  // Create the shift
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .insert(shiftData)
    .select()
    .single();
  if (shiftError) throw shiftError;

  // Insert crew snapshot
  if (crewEntries.length > 0) {
    const rows = crewEntries.map((entry) => ({
      shift_id: shift.id,
      crew_member_id: entry.crew_member_id,
      hours: entry.hours,
      role_on_shift: entry.role_on_shift || null,
      notes: entry.notes || null,
    }));

    const { error: crewError } = await supabase
      .from("shift_crew")
      .insert(rows);
    if (crewError) throw crewError;
  }

  return shift;
}
