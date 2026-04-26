import { supabase } from "@/integrations/supabase/client";

export type IncidentDocumentType = "of286" | "other";

export interface IncidentDocument {
  id: string;
  incident_id: string;
  organization_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_by_user_id: string | null;
  created_at: string;
}

export async function fetchIncidentDocuments(
  incidentId: string,
  documentType?: IncidentDocumentType,
): Promise<IncidentDocument[]> {
  let q = supabase
    .from("incident_documents")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });
  if (documentType) q = q.eq("document_type", documentType);
  const { data, error } = await q;
  if (error) throw error;
  return data as IncidentDocument[];
}

export async function uploadIncidentDocumentFile(
  file: File,
  organizationId: string,
  incidentId: string,
): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${organizationId}/${incidentId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("incident-documents")
    .upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("incident-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function createIncidentDocument(doc: {
  incident_id: string;
  organization_id: string;
  document_type: IncidentDocumentType;
  file_url: string;
  file_name: string;
  uploaded_by_user_id?: string | null;
}): Promise<IncidentDocument> {
  const { data, error } = await supabase
    .from("incident_documents")
    .insert(doc)
    .select()
    .single();
  if (error) throw error;
  return data as IncidentDocument;
}

export async function deleteIncidentDocument(id: string): Promise<void> {
  const { error } = await supabase.from("incident_documents").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Bulk: returns a Set of incident IDs that have at least one OF-286 document.
 * Used to flag missing-form indicators on lists.
 */
export async function fetchIncidentsWithOF286(
  incidentIds: string[],
): Promise<Set<string>> {
  if (incidentIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("incident_documents")
    .select("incident_id")
    .eq("document_type", "of286")
    .in("incident_id", incidentIds);
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.incident_id as string));
}
