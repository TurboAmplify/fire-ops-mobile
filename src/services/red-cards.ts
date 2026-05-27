import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type RedCard = Tables<"red_cards">;
export type RedCardInsert = TablesInsert<"red_cards">;
export type RedCardUpdate = TablesUpdate<"red_cards">;

export type Qualification = {
  qualification: string;
  code: string;
  status: string;
};

export const WORK_CAPACITY_OPTIONS = ["Arduous", "Moderate", "Light"] as const;
export const RT130_STATUS_OPTIONS = ["Current", "Expired", "Pending"] as const;

const BUCKET = "red-cards";

export async function fetchRedCardByMember(crewMemberId: string) {
  const { data, error } = await supabase
    .from("red_cards")
    .select("*")
    .eq("crew_member_id", crewMemberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRedCardForUser(userId: string) {
  // resolve user → crew_member_id via profiles, then fetch card
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("crew_member_id")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw pErr;
  const cmId = (profile as any)?.crew_member_id;
  if (!cmId) return null;
  return fetchRedCardByMember(cmId);
}

export async function upsertRedCard(row: RedCardInsert): Promise<RedCard> {
  const { data, error } = await supabase
    .from("red_cards")
    .upsert(row, { onConflict: "crew_member_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRedCard(id: string, updates: RedCardUpdate) {
  const { data, error } = await supabase
    .from("red_cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRedCard(id: string) {
  const { error } = await supabase.from("red_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadRedCardFile(
  organizationId: string,
  crewMemberId: string,
  file: File,
  kind: "photo" | "source",
) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${organizationId}/${crewMemberId}/${kind}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path; // store the storage path; use getViewableUrl/SignedImage to display
}
