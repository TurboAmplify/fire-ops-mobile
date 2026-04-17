import { supabase } from "@/integrations/supabase/client";

export interface CrewTruckAccess {
  id: string;
  organization_id: string;
  user_id: string;
  truck_id: string;
  granted_by: string | null;
  granted_at: string;
}

export async function fetchAccessForUser(orgId: string, userId: string) {
  const { data, error } = await supabase
    .from("crew_truck_access")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
  return data as CrewTruckAccess[];
}

export async function fetchAccessForTruck(truckId: string) {
  const { data, error } = await supabase
    .from("crew_truck_access")
    .select("*, profiles:user_id(full_name)")
    .eq("truck_id", truckId);
  if (error) throw error;
  return data as (CrewTruckAccess & { profiles: { full_name: string | null } | null })[];
}

export async function grantTruckAccess(params: {
  organizationId: string;
  userId: string;
  truckId: string;
  grantedBy?: string;
}) {
  const { error } = await supabase.from("crew_truck_access").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    truck_id: params.truckId,
    granted_by: params.grantedBy ?? null,
  });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function revokeTruckAccess(params: {
  userId: string;
  truckId: string;
}) {
  const { error } = await supabase
    .from("crew_truck_access")
    .delete()
    .eq("user_id", params.userId)
    .eq("truck_id", params.truckId);
  if (error) throw error;
}
