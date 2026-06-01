import { supabase } from "@/integrations/supabase/client";

export interface GaccRegion {
  id: string;
  name: string;
  states: string[];
  sort_order: number;
}

export interface FinanceOfficer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  work_phone: string | null;
  cell_phone: string | null;
  dispatch_office: string | null;
  region_id: string | null;
  agency: string | null;
  notes: string | null;
  is_active: boolean;
  verified_at: string | null;
  last_used_at: string | null;
  use_count: number;
}

export async function listRegions(): Promise<GaccRegion[]> {
  const { data, error } = await supabase
    .from("gacc_regions")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as GaccRegion[];
}

export async function listFinanceOfficers(opts: {
  regionId?: string | null;
  search?: string;
  limit?: number;
}): Promise<FinanceOfficer[]> {
  let q = supabase
    .from("finance_officers")
    .select("*")
    .eq("is_active", true)
    .order("verified_at", { ascending: false, nullsFirst: false })
    .order("use_count", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.regionId) q = q.eq("region_id", opts.regionId);
  if (opts.search && opts.search.trim()) {
    const s = `%${opts.search.trim()}%`;
    q = q.or(`name.ilike.${s},email.ilike.${s},dispatch_office.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FinanceOfficer[];
}

export async function createFinanceOfficer(input: {
  name: string;
  email: string;
  phone?: string;
  work_phone?: string;
  cell_phone?: string;
  dispatch_office?: string;
  region_id?: string | null;
  agency?: string;
  notes?: string;
  org_id?: string | null;
}): Promise<FinanceOfficer> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("finance_officers")
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone || input.cell_phone || input.work_phone || null,
      work_phone: input.work_phone || null,
      cell_phone: input.cell_phone || null,
      dispatch_office: input.dispatch_office || null,
      region_id: input.region_id || null,
      agency: input.agency || null,
      notes: input.notes || null,
      created_by_user_id: user?.id ?? null,
      created_by_org_id: input.org_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FinanceOfficer;
}

export async function recordOfficerUse(officerId: string): Promise<void> {
  // Best-effort; ignore failures
  const { data } = await supabase
    .from("finance_officers")
    .select("use_count")
    .eq("id", officerId)
    .maybeSingle();
  await supabase
    .from("finance_officers")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: (data?.use_count ?? 0) + 1,
    })
    .eq("id", officerId);
}
