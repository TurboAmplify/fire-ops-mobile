import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type CrewMember = Tables<"crew_members">;
export type CrewMemberInsert = TablesInsert<"crew_members">;
export type CrewMemberUpdate = TablesUpdate<"crew_members">;

export async function fetchCrewMembers() {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchCrewMember(id: string) {
  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCrewMember(member: CrewMemberInsert) {
  const { data, error } = await supabase
    .from("crew_members")
    .insert(member)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCrewMember(id: string, updates: CrewMemberUpdate) {
  const { data, error } = await supabase
    .from("crew_members")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Crew Profile Photos ---

export async function uploadCrewPhoto(
  memberId: string,
  organizationId: string,
  file: File
) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${organizationId}/${memberId}/profile_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("crew-photos")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("crew-photos")
    .getPublicUrl(path);

  const { error } = await supabase
    .from("crew_members")
    .update({ profile_photo_url: urlData.publicUrl } as any)
    .eq("id", memberId);
  if (error) throw error;

  return urlData.publicUrl;
}

export async function deleteCrewPhoto(memberId: string) {
  const { error } = await supabase
    .from("crew_members")
    .update({ profile_photo_url: null } as any)
    .eq("id", memberId);
  if (error) throw error;
}
