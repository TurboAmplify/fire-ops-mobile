import { supabase } from "@/integrations/supabase/client";

export interface Agreement {
  id: string;
  incident_id: string | null;
  incident_truck_id: string | null;
  file_url: string;
  file_name: string;
  agreement_number: string | null;
  parsed_data: Record<string, any>;
  created_at: string;
}

export async function fetchAgreements(params: {
  incidentId?: string;
  incidentTruckId?: string;
}): Promise<Agreement[]> {
  let query = supabase.from("agreements").select("*").order("created_at", { ascending: false });
  if (params.incidentId) query = query.eq("incident_id", params.incidentId);
  if (params.incidentTruckId) query = query.eq("incident_truck_id", params.incidentTruckId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Agreement[];
}

export async function uploadAgreementFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("agreements").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("agreements").getPublicUrl(path);
  return data.publicUrl;
}

export async function createAgreement(agreement: {
  incident_id?: string | null;
  incident_truck_id?: string | null;
  file_url: string;
  file_name: string;
  agreement_number?: string | null;
}): Promise<Agreement> {
  const { data, error } = await supabase
    .from("agreements")
    .insert(agreement)
    .select()
    .single();
  if (error) throw error;
  return data as Agreement;
}
