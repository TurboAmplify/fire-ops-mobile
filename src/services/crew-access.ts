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
  return (data ?? []) as CrewTruckAccess[];
}

export async function fetchAccessForTruck(truckId: string) {
  const { data, error } = await supabase
    .from("crew_truck_access")
    .select("*")
    .eq("truck_id", truckId);
  if (error) throw error;
  const rows = (data ?? []) as CrewTruckAccess[];
  if (rows.length === 0) return [] as (CrewTruckAccess & { full_name: string | null })[];

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", rows.map((r) => r.user_id));
  const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name as string | null]));
  return rows.map((r) => ({ ...r, full_name: map.get(r.user_id) ?? null }));
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
  if (error && (error as any).code !== "23505") throw error;
}

export async function revokeTruckAccess(params: { userId: string; truckId: string }) {
  const { error } = await supabase
    .from("crew_truck_access")
    .delete()
    .eq("user_id", params.userId)
    .eq("truck_id", params.truckId);
  if (error) throw error;
}
