import { supabase } from "@/integrations/supabase/client";
import { assertOnlineForWrite } from "@/lib/offline-guard";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { EvalRatings } from "@/lib/eval-225";

export type PersonnelEval = Omit<Tables<"personnel_evals">, "ratings"> & { ratings: EvalRatings };
export type PersonnelEvalInsert = TablesInsert<"personnel_evals">;
export type PersonnelEvalUpdate = TablesUpdate<"personnel_evals">;

const SELECT = "*";

export async function fetchEvals(orgId: string | null): Promise<PersonnelEval[]> {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("personnel_evals")
    .select(SELECT)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PersonnelEval[];
}

export async function fetchEval(id: string): Promise<PersonnelEval | null> {
  const { data, error } = await supabase
    .from("personnel_evals")
    .select(SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PersonnelEval) ?? null;
}

export async function createEval(input: PersonnelEvalInsert): Promise<PersonnelEval> {
  assertOnlineForWrite();
  const { data, error } = await supabase.from("personnel_evals").insert(input).select(SELECT).single();
  if (error) throw error;
  return data as unknown as PersonnelEval;
}

export async function updateEval(id: string, patch: PersonnelEvalUpdate): Promise<PersonnelEval> {
  assertOnlineForWrite();
  const { data, error } = await supabase
    .from("personnel_evals")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as PersonnelEval;
}

export async function deleteEval(id: string): Promise<void> {
  assertOnlineForWrite();
  const { error } = await supabase
    .from("personnel_evals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadEvalSignature(
  blob: Blob,
  evalId: string,
  type: "rater" | "employee",
): Promise<string> {
  assertOnlineForWrite();
  const path = `evals/${evalId}/${type}-${Date.now()}.png`;
  const { error } = await supabase.storage.from("signatures").upload(path, blob, {
    contentType: "image/png",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("signatures").getPublicUrl(path);
  return data.publicUrl;
}
