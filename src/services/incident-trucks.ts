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
    .order("assigned_at", { ascending: true });
  if (error) throw error;
  return data as IncidentTruckWithTruck[];
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
  const { data, error } = await supabase
    .from("incident_trucks")
    .insert({ incident_id: incidentId, truck_id: truckId })
    .select()
    .single();
  if (error) throw error;
  return data as IncidentTruck;
}

export async function removeTruckFromIncident(id: string): Promise<void> {
  const { error } = await supabase
    .from("incident_trucks")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateIncidentTruckStatus(id: string, status: IncidentTruckStatus) {
  const { error } = await supabase
    .from("incident_trucks")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
