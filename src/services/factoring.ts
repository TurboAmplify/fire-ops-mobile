import { supabase } from "@/integrations/supabase/client";

export interface OrgFactoringSettings {
  id: string;
  organization_id: string;
  factor_company_name: string;
  factor_contact_name: string | null;
  factor_contact_email: string | null;
  factor_contact_phone: string | null;
  reserve_percent: number;
  agreement_date: string | null;
  signer_name: string | null;
  signer_title: string;
  signature_url: string | null;
  next_schedule_number: number;
  created_at: string;
  updated_at: string;
}

export interface FactoringSubmission {
  id: string;
  organization_id: string;
  incident_id: string;
  schedule_number: number;
  total_amount: number;
  reserve_amount: number;
  reserve_percent: number;
  account_count: number;
  recipient_email: string;
  recipient_name: string | null;
  factor_company_name: string | null;
  seller: string | null;
  pdf_url: string | null;
  document_ids: string[];
  line_items: ScheduleLineItem[];
  submitted_by_user_id: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
  email_message_id: string | null;
  notes: string | null;
}

export interface ScheduleLineItem {
  document_id: string;
  account_debtor: string;
  invoice_number: string;
  invoice_amount: number;
  invoice_date: string;
}

export async function fetchOrgFactoringSettings(orgId: string): Promise<OrgFactoringSettings | null> {
  const { data, error } = await supabase
    .from("org_factoring_settings" as any)
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return (data as OrgFactoringSettings | null) ?? null;
}

export async function upsertOrgFactoringSettings(
  orgId: string,
  patch: Partial<Omit<OrgFactoringSettings, "id" | "organization_id" | "created_at" | "updated_at">>,
): Promise<OrgFactoringSettings> {
  const { data, error } = await supabase
    .from("org_factoring_settings" as any)
    .upsert(
      { organization_id: orgId, ...patch },
      { onConflict: "organization_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as OrgFactoringSettings;
}

export async function uploadFactoringSignature(orgId: string, blob: Blob): Promise<string> {
  const path = `${orgId}/signatures/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("factoring-documents")
    .upload(path, blob, { contentType: "image/png" });
  if (error) throw error;
  // Private bucket — store the storage path; consumers resolve via getViewableUrl.
  const { data } = supabase.storage.from("factoring-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFactoringSchedulePdf(
  orgId: string,
  incidentId: string,
  blob: Blob,
  scheduleNumber: number,
): Promise<string> {
  const path = `${orgId}/schedules/${incidentId}-${scheduleNumber}-${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from("factoring-documents")
    .upload(path, blob, { contentType: "application/pdf" });
  if (error) throw error;
  const { data } = supabase.storage.from("factoring-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchFactoringSubmissions(
  incidentId: string,
): Promise<FactoringSubmission[]> {
  const { data, error } = await supabase
    .from("factoring_submissions" as any)
    .select("*")
    .eq("incident_id", incidentId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FactoringSubmission[];
}

export async function updateOf286Parsed(
  documentId: string,
  parsed: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("incident_documents")
    .update({ of286_parsed: parsed } as any)
    .eq("id", documentId);
  if (error) throw error;
}
