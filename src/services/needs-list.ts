import { supabase } from "@/integrations/supabase/client";

export type NeedsListItem = {
  id: string;
  organization_id: string;
  title: string;
  notes: string | null;
  category: string;
  crew_member_id: string | null;
  truck_id: string | null;
  is_purchased: boolean;
  purchased_at: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

export type NeedsListInsert = {
  organization_id: string;
  title: string;
  notes?: string | null;
  category?: string;
  crew_member_id?: string | null;
  truck_id?: string | null;
  created_by_user_id?: string | null;
};

export type NeedsListUpdate = {
  title?: string;
  notes?: string | null;
  category?: string;
  crew_member_id?: string | null;
  truck_id?: string | null;
  is_purchased?: boolean;
  purchased_at?: string | null;
};

export async function fetchNeedsListItems(orgId: string) {
  const { data, error } = await supabase
    .from("needs_list_items" as any)
    .select("*")
    .eq("organization_id", orgId)
    .order("is_purchased", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as NeedsListItem[];
}

export async function createNeedsListItem(item: NeedsListInsert) {
  const { data, error } = await supabase
    .from("needs_list_items" as any)
    .insert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as NeedsListItem;
}

export async function updateNeedsListItem(id: string, updates: NeedsListUpdate) {
  const { data, error } = await supabase
    .from("needs_list_items" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as NeedsListItem;
}

export async function deleteNeedsListItem(id: string) {
  const { error } = await supabase
    .from("needs_list_items" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}
