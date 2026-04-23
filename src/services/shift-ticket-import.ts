import { supabase } from "@/integrations/supabase/client";
import { getViewableUrl } from "@/lib/storage-url";

/**
 * Upload a photo or PDF of a paper shift ticket to scratch storage so the
 * `parse-shift-ticket` edge function can fetch it. Reuses the existing
 * `resource-orders` bucket (same auth model: org members can read/write under
 * their org prefix) under a dedicated `imports/` subpath so it never mixes
 * with real resource order rows.
 */
export async function uploadShiftTicketImport(
  file: File,
  organizationId: string | undefined
): Promise<string> {
  if (!organizationId) {
    throw new Error("Cannot import without an organization");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${organizationId}/imports/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("resource-orders")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("resource-orders").getPublicUrl(path);
  return data.publicUrl;
}

export interface ParsedShiftTicket {
  agreement_number?: string;
  contractor_name?: string;
  resource_order_number?: string;
  incident_name?: string;
  incident_number?: string;
  financial_code?: string;
  equipment_make_model?: string;
  equipment_type?: string;
  serial_vin_number?: string;
  license_id_number?: string;
  transport_retained?: boolean;
  is_first_last?: boolean;
  miles?: number;
  remarks?: string;
  contractor_rep_name?: string;
  supervisor_name?: string;
  equipment_entries?: Array<{
    date?: string;
    start?: string;
    stop?: string;
    quantity?: string;
    type?: string;
    remarks?: string;
  }>;
  personnel_entries?: Array<{
    date?: string;
    operator_name?: string;
    op_start?: string;
    op_stop?: string;
    sb_start?: string;
    sb_stop?: string;
    activity_type?: "travel" | "work";
    remarks?: string;
  }>;
}

export async function parseShiftTicketAI(
  fileUrl: string,
  fileName: string
): Promise<ParsedShiftTicket> {
  const resolved = (await getViewableUrl(fileUrl)) ?? fileUrl;
  const { data, error } = await supabase.functions.invoke("parse-shift-ticket", {
    body: { fileUrl: resolved, fileName },
  });
  if (error) throw error;
  return (data?.parsed ?? {}) as ParsedShiftTicket;
}
