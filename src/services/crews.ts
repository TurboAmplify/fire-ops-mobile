import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Crew = Tables<"crews">;
export type CrewInsert = TablesInsert<"crews">;
export type CrewUpdate = TablesUpdate<"crews">;

export async function fetchCrews(orgId?: string | null) {
  let query = supabase.from("crews").select("*").order("name");
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCrew(id: string) {
  const { data, error } = await supabase
    .from("crews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCrew(crew: CrewInsert) {
  const { data, error } = await supabase
    .from("crews")
    .insert(crew)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCrewsBulk(orgId: string, names: string[]) {
  const rows = names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ organization_id: orgId, name }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from("crews").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateCrew(id: string, updates: CrewUpdate) {
  const { data, error } = await supabase
    .from("crews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCrew(id: string) {
  const { error } = await supabase.from("crews").delete().eq("id", id);
  if (error) throw error;
}

export async function assignMemberToCrew(memberId: string, crewId: string | null) {
  const { error } = await supabase
    .from("crew_members")
    .update({ crew_id: crewId } as any)
    .eq("id", memberId);
  if (error) throw error;
}
