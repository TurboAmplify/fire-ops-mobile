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

export async function fetchAvailableCrewMembers(organizationId?: string | null) {
  let query = supabase
    .from("crew_members")
    .select("*")
    .eq("active", true)
    .order("name");
  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function assignCrewToTruck(incidentTruckId: string, crewMemberId: string, roleOnAssignment?: string) {
  // Check if a released row already exists (unique constraint on incident_truck_id + crew_member_id)
  const { data: existing } = await supabase
    .from("incident_truck_crew")
    .select("id")
    .eq("incident_truck_id", incidentTruckId)
    .eq("crew_member_id", crewMemberId)
    .eq("is_active", false)
    .maybeSingle();

  if (existing) {
    // Reactivate the existing row
    const { data, error } = await supabase
      .from("incident_truck_crew")
      .update({
        is_active: true,
        released_at: null,
        role_on_assignment: roleOnAssignment || null,
      })
      .eq("id", existing.id)
      .select("*, crew_members(*)")
      .single();
    if (error) throw error;
    return data as IncidentTruckCrewWithMember;
  }

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

/**
 * Sync the operator names from a shift ticket back into the incident_truck_crew
 * roster. Operators on the ticket but not yet active get added; active crew
 * not present on the ticket get released. Names are matched case-insensitively.
 *
 * Returns counts so callers can surface a toast.
 */
export async function syncTicketCrewToIncidentTruck(opts: {
  incidentTruckId: string;
  organizationId: string;
  /** Trimmed operator names from the ticket's personnel_entries */
  ticketOperatorNames: string[];
}): Promise<{ added: number; released: number; unmatched: string[] }> {
  const { incidentTruckId, organizationId, ticketOperatorNames } = opts;
  const wantedNames = Array.from(
    new Set(
      ticketOperatorNames
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    )
  );
  const wantedLower = new Set(wantedNames.map((n) => n.toLowerCase()));

  // Current active assignments for this incident_truck
  const current = await fetchIncidentTruckCrew(incidentTruckId);
  const currentActive = current.filter((c) => c.is_active);
  const currentLowerSet = new Set(
    currentActive.map((c) => (c.crew_members?.name ?? "").trim().toLowerCase())
  );

  // Pull all active crew members in the org so we can resolve names → crew_member_id
  const { data: orgCrew, error: crewErr } = await supabase
    .from("crew_members")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (crewErr) throw crewErr;

  const crewByLowerName = new Map<string, string>();
  (orgCrew ?? []).forEach((c) => {
    const key = (c.name ?? "").trim().toLowerCase();
    if (key) crewByLowerName.set(key, c.id);
  });

  // Add: present on ticket, not currently active on truck
  const toAdd = wantedNames.filter((n) => !currentLowerSet.has(n.toLowerCase()));
  const unmatched: string[] = [];
  let added = 0;
  for (const name of toAdd) {
    const crewId = crewByLowerName.get(name.toLowerCase());
    if (!crewId) {
      unmatched.push(name);
      continue;
    }
    try {
      await assignCrewToTruck(incidentTruckId, crewId);
      added += 1;
    } catch (err) {
      console.error("syncTicketCrewToIncidentTruck: failed to assign", name, err);
    }
  }

  // Release: currently active on truck, not present on ticket
  const toRelease = currentActive.filter(
    (c) => !wantedLower.has((c.crew_members?.name ?? "").trim().toLowerCase())
  );
  let released = 0;
  for (const assignment of toRelease) {
    try {
      await releaseCrewFromTruck(assignment.id);
      released += 1;
    } catch (err) {
      console.error("syncTicketCrewToIncidentTruck: failed to release", assignment.id, err);
    }
  }

  return { added, released, unmatched };
}
