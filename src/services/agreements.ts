import { supabase } from "@/integrations/supabase/client";

export interface Agreement {
  id: string;
  incident_id: string | null;
  incident_truck_id: string | null;
  organization_id: string | null;
  file_url: string;
  file_name: string;
  agreement_number: string | null;
  parsed_data: Record<string, any>;
  created_at: string;
}

export async function fetchAgreements(params: {
  incidentId?: string;
  incidentTruckId?: string;
  orgOnly?: boolean;
  organizationId?: string;
}): Promise<Agreement[]> {
  let query = supabase.from("agreements").select("*").order("created_at", { ascending: false });
  if (params.orgOnly && params.organizationId) {
    // Master Agreement = org-wide (no incident, no truck)
    query = query
      .eq("organization_id", params.organizationId)
      .is("incident_id", null)
      .is("incident_truck_id", null);
  } else {
    if (params.incidentId) query = query.eq("incident_id", params.incidentId);
    if (params.incidentTruckId) query = query.eq("incident_truck_id", params.incidentTruckId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Agreement[];
}

export async function deleteAgreement(id: string): Promise<void> {
  const { error } = await supabase.from("agreements").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadAgreementFile(file: File, organizationId?: string): Promise<string> {
  if (!organizationId) {
    throw new Error("Cannot upload agreement without an organization");
  }
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("agreements").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("agreements").getPublicUrl(path);
  return data.publicUrl;
}

export async function createAgreement(agreement: {
  incident_id?: string | null;
  incident_truck_id?: string | null;
  organization_id?: string | null;
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
