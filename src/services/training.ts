import { supabase } from "@/integrations/supabase/client";

export interface TrainingRecord {
  id: string;
  organization_id: string;
  crew_member_id: string;
  course_name: string;
  completed_at: string | null;
  expires_at: string | null;
  hours: number | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
}

export async function listTrainingRecords(orgId: string) {
  const { data, error } = await supabase
    .from("training_records" as any)
    .select("*, crew_members(name)")
    .eq("organization_id", orgId)
    .order("completed_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as any[];
}

export async function createTrainingRecord(input: Omit<TrainingRecord, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("training_records" as any)
    .insert(input as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrainingRecord(id: string, updates: Partial<TrainingRecord>) {
  const { data, error } = await supabase
    .from("training_records" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrainingRecord(id: string) {
  const { error } = await supabase.from("training_records" as any).delete().eq("id", id);
  if (error) throw error;
}
