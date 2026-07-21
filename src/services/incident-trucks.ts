import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type IncidentTruck = Tables<"incident_trucks">;
export type IncidentTruckInsert = TablesInsert<"incident_trucks">;
export type Truck = Tables<"trucks">;

export type IncidentTruckStatus = "assigned" | "active" | "demobed" | "completed";

export const TRUCK_STATUS_LABELS: Record<IncidentTruckStatus, string> = {
  assigned: "Assigned",
  active: "Active",
  demobed: "Demobed",
  completed: "Completed",
};

export type IncidentTruckWithTruck = IncidentTruck & {
  trucks: Truck;
};

export async function fetchIncidentTrucks(incidentId: string) {
  const { data, error } = await supabase
    .from("incident_trucks")
    .select("*, trucks(*)")
    .eq("incident_id", incidentId)
    .is("deleted_at", null)
    .order("assigned_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as IncidentTruckWithTruck[];
  // Stable order: group by truck name, then by part number.
  rows.sort((a, b) => {
    const nameCmp = (a.trucks.name ?? "").localeCompare(b.trucks.name ?? "");
    if (nameCmp !== 0) return nameCmp;
    return ((a as any).part_number ?? 1) - ((b as any).part_number ?? 1);
  });
  return rows;
}

/**
 * Start a new "part" for an existing truck assignment on an incident.
 * Used when a truck gets a second resource order (crew swap, rotation, etc.)
 * so that Part 1 keeps its own shift tickets / RO / OF-286 and Part 2 starts fresh.
 */
export async function startNewTruckPart(incidentTruckId: string): Promise<IncidentTruck> {
  const { data: current, error: curErr } = await supabase
    .from("incident_trucks")
    .select("incident_id, truck_id")
    .eq("id", incidentTruckId)
    .single();
  if (curErr) throw curErr;

  // Find highest existing part_number for this (incident, truck), including trashed rows
  // so we don't collide with a soft-deleted part.
  const { data: existing, error: exErr } = await supabase
    .from("incident_trucks")
    .select("part_number")
    .eq("incident_id", current.incident_id)
    .eq("truck_id", current.truck_id);
  if (exErr) throw exErr;
  const maxPart = (existing ?? []).reduce(
    (m: number, r: any) => Math.max(m, r.part_number ?? 1),
    0,
  );

  const { data: inserted, error: insErr } = await supabase
    .from("incident_trucks")
    .insert({
      incident_id: current.incident_id,
      truck_id: current.truck_id,
      part_number: maxPart + 1,
    })
    .select()
    .single();
  if (insErr) throw insErr;
  return inserted as IncidentTruck;
}


export async function fetchAvailableTrucks(organizationId?: string) {
  let query = supabase.from("trucks").select("*").order("name");
  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function assignTruckToIncident(incidentId: string, truckId: string): Promise<IncidentTruck> {
  // If a non-deleted row already exists, reuse it.
  const { data: existingRows, error: existingError } = await supabase
    .from("incident_trucks")
    .select("*")
    .eq("incident_id", incidentId)
    .eq("truck_id", truckId)
    .is("deleted_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1);

  if (existingError) throw existingError;
  if (existingRows?.[0]) return existingRows[0] as IncidentTruck;

  // If a soft-deleted row exists, restore it instead of inserting a duplicate.
  const { data: trashedRows } = await supabase
    .from("incident_trucks")
    .select("*")
    .eq("incident_id", incidentId)
    .eq("truck_id", truckId)
    .not("deleted_at", "is", null)
    .order("assigned_at", { ascending: false })
    .limit(1);
  if (trashedRows?.[0]) {
    const { data: restored, error: restoreErr } = await supabase
      .from("incident_trucks")
      .update({ deleted_at: null, deleted_by_user_id: null, deleted_reason: null })
      .eq("id", trashedRows[0].id)
      .select()
      .single();
    if (restoreErr) throw restoreErr;
    return restored as IncidentTruck;
  }

  const { error } = await supabase
    .from("incident_trucks")
    .insert({ incident_id: incidentId, truck_id: truckId });

  if (error) throw error;

  const { data: inserted, error: insertedError } = await supabase
    .from("incident_trucks")
    .select("*")
    .eq("incident_id", incidentId)
    .eq("truck_id", truckId)
    .is("deleted_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .single();

  if (insertedError) throw insertedError;
  return inserted as IncidentTruck;
}

/**
 * Soft-remove a truck from an incident. Shift tickets, docs, threads remain
 * intact and the row can be restored from the Trash page.
 */
export async function removeTruckFromIncident(id: string, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("incident_trucks")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: user?.id ?? null,
      deleted_reason: reason ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreIncidentTruck(id: string): Promise<void> {
  const { error } = await supabase
    .from("incident_trucks")
    .update({ deleted_at: null, deleted_by_user_id: null, deleted_reason: null })
    .eq("id", id);
  if (error) throw error;
}

export async function hardDeleteIncidentTruck(id: string): Promise<void> {
  const { error } = await supabase.from("incident_trucks").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTrashedIncidentTrucks(orgId?: string | null) {
  // Filter to current org's trucks via the trucks join.
  let query = supabase
    .from("incident_trucks")
    .select("*, trucks!inner(*), incidents(name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (orgId) query = query.eq("trucks.organization_id", orgId);
  const { data, error } = await query;
  if (error) throw error;
  return data as (IncidentTruckWithTruck & { incidents: { name: string } | null })[];
}

export async function updateIncidentTruckStatus(id: string, status: IncidentTruckStatus) {
  const { error } = await supabase
    .from("incident_trucks")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
