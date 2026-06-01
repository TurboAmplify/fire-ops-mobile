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

export interface CrewWithRedCard {
  crew_member_id: string;
  name: string;
  position: string | null;
  card: RedCard | null;
  truck_name?: string | null;
}

/** All crew members assigned to any truck on this incident, with red card (if any) and truck name. */
export async function listAssignedCrewWithRedCards(incidentId: string): Promise<CrewWithRedCard[]> {
  const { data: trucks, error: tErr } = await supabase
    .from("incident_trucks")
    .select("id, trucks(id, name)")
    .eq("incident_id", incidentId);
  if (tErr) throw tErr;
  const truckIds = (trucks ?? []).map((t: any) => t.id);
  if (truckIds.length === 0) return [];
  const truckNameById = new Map<string, string>();
  for (const t of trucks ?? []) {
    truckNameById.set((t as any).id, (t as any).trucks?.name ?? "");
  }

  const { data: rows, error } = await supabase
    .from("incident_truck_crew")
    .select("crew_member_id, incident_truck_id, crew_members(id, name, position, organization_id)")
    .in("incident_truck_id", truckIds)
    .eq("is_active", true);
  if (error) throw error;

  const memberMap = new Map<string, { name: string; position: string | null; truck_name: string | null }>();
  for (const r of rows ?? []) {
    const cm: any = (r as any).crew_members;
    if (!cm?.id) continue;
    if (!memberMap.has(cm.id)) {
      memberMap.set(cm.id, {
        name: cm.name ?? "Unnamed",
        position: cm.position ?? null,
        truck_name: truckNameById.get((r as any).incident_truck_id) ?? null,
      });
    }
  }
  const ids = Array.from(memberMap.keys());
  if (ids.length === 0) return [];

  const { data: cards } = await supabase.from("red_cards").select("*").in("crew_member_id", ids);
  const cardByMember = new Map<string, RedCard>();
  for (const c of cards ?? []) cardByMember.set((c as any).crew_member_id, c as RedCard);

  return ids.map((id) => {
    const info = memberMap.get(id)!;
    return {
      crew_member_id: id,
      name: info.name,
      position: info.position,
      truck_name: info.truck_name,
      card: cardByMember.get(id) ?? null,
    };
  });
}

/** All crew members in the org, with red card (if any). */
export async function listOrgCrewWithRedCards(organizationId: string): Promise<CrewWithRedCard[]> {
  const { data: members, error } = await supabase
    .from("crew_members")
    .select("id, name, position")
    .eq("organization_id", organizationId);
  if (error) throw error;
  const ids = (members ?? []).map((m: any) => m.id);
  if (ids.length === 0) return [];
  const { data: cards } = await supabase.from("red_cards").select("*").in("crew_member_id", ids);
  const cardByMember = new Map<string, RedCard>();
  for (const c of cards ?? []) cardByMember.set((c as any).crew_member_id, c as RedCard);
  return (members ?? []).map((m: any) => ({
    crew_member_id: m.id,
    name: m.name ?? "Unnamed",
    position: m.position ?? null,
    card: cardByMember.get(m.id) ?? null,
  }));
}
