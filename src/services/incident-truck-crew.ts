import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type IncidentTruckCrew = Tables<"incident_truck_crew">;
export type CrewMember = Tables<"crew_members">;

export type IncidentTruckCrewWithMember = IncidentTruckCrew & {
  crew_members: CrewMember;
};

export async function fetchIncidentTruckCrew(incidentTruckId: string) {
  const { data, error } = await supabase
    .from("incident_truck_crew")
    .select("*, crew_members(*)")
    .eq("incident_truck_id", incidentTruckId)
    .order("assigned_at", { ascending: true });
  if (error) throw error;
  return data as IncidentTruckCrewWithMember[];
}

export async function fetchAvailableCrewMembers() {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function assignCrewToTruck(incidentTruckId: string, crewMemberId: string, roleOnAssignment?: string) {
  const { data, error } = await supabase
    .from("incident_truck_crew")
    .insert({
      incident_truck_id: incidentTruckId,
      crew_member_id: crewMemberId,
      role_on_assignment: roleOnAssignment || null,
    })
    .select("*, crew_members(*)")
    .single();
  if (error) throw error;
  return data as IncidentTruckCrewWithMember;
}

export async function releaseCrewFromTruck(id: string) {
  const { error } = await supabase
    .from("incident_truck_crew")
    .update({
      is_active: false,
      released_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
