import { supabase } from "@/integrations/supabase/client";

export type IncidentDocumentType = "of286" | "other";
export type IncidentDocumentStage = "original" | "contractor_signed" | "finance_signed";

export interface IncidentDocument {
  id: string;
  incident_id: string;
  organization_id: string;
  document_type: string;
  stage: IncidentDocumentStage;
  parent_document_id: string | null;
  file_url: string;
  file_name: string;
  uploaded_by_user_id: string | null;
  signature_url: string | null;
  signed_by_user_id: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  created_at: string;
  of286_invoice_total: number | null;
  of286_entered_at: string | null;
}

export interface IncidentDocumentAuditEntry {
  id: string;
  organization_id: string;
  incident_id: string;
  document_id: string | null;
  document_type: string;
  stage: string | null;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  file_name: string | null;
  notes: string | null;
  occurred_at: string;
}

export async function updateIncidentDocumentInvoiceTotal(
  id: string,
  total: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("incident_documents")
    .update({
      of286_invoice_total: total,
      of286_entered_at: total != null ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
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
  file: File | Blob,
  organizationId: string,
  incidentId: string,
  fileName?: string,
): Promise<string> {
  const name = fileName || (file as File).name || "file.pdf";
  const ext = name.split(".").pop() || "pdf";
  const path = `${organizationId}/${incidentId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("incident-documents")
    .upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("incident-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSignatureImage(
  blob: Blob,
  organizationId: string,
  incidentId: string,
): Promise<string> {
  const path = `${organizationId}/${incidentId}/sig-${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("incident-documents")
    .upload(path, blob, { contentType: "image/png" });
  if (error) throw error;
  const { data } = supabase.storage.from("incident-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function createIncidentDocument(doc: {
  incident_id: string;
  organization_id: string;
  document_type: IncidentDocumentType;
  stage?: IncidentDocumentStage;
  parent_document_id?: string | null;
  file_url: string;
  file_name: string;
  uploaded_by_user_id?: string | null;
  signature_url?: string | null;
  signed_by_user_id?: string | null;
  signed_by_name?: string | null;
  signed_at?: string | null;
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
 */
export async function fetchIncidentsWithOF286(
  incidentIds: string[],
): Promise<string[]> {
  if (incidentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("incident_documents")
    .select("incident_id")
    .eq("document_type", "of286")
    .in("incident_id", incidentIds);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r: any) => r.incident_id as string)));
}

// ---------------- Audit log ----------------

export async function logIncidentDocumentEvent(entry: {
  organization_id: string;
  incident_id: string;
  document_id: string | null;
  document_type?: string;
  stage?: string | null;
  event_type: "uploaded" | "signed" | "downloaded" | "replaced" | "deleted";
  actor_user_id?: string | null;
  actor_name?: string | null;
  file_name?: string | null;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("incident_document_audit").insert({
    document_type: "of286",
    ...entry,
  });
  if (error) {
    // Audit failures shouldn't block primary actions; surface to console.
    console.warn("incident_document_audit insert failed:", error.message);
  }
}

export async function fetchIncidentDocumentAudit(
  incidentId: string,
  documentType: string = "of286",
): Promise<IncidentDocumentAuditEntry[]> {
  const { data, error } = await supabase
    .from("incident_document_audit")
    .select("*")
    .eq("incident_id", incidentId)
    .eq("document_type", documentType)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as IncidentDocumentAuditEntry[];
}
