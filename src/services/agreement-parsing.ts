import { supabase } from "@/integrations/supabase/client";

export interface ParsedAgreement {
  incident_name?: string;
  incident_location?: string;
  incident_type?: string;
  agreement_number?: string;
  resource_order_number?: string;
  truck_name?: string;
  start_date?: string;
  end_date?: string;
  reporting_location?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  special_instructions?: string;
  additional_data?: Record<string, string>;
}

export async function parseAgreementAI(fileUrl: string, fileName: string): Promise<ParsedAgreement> {
  const { data, error } = await supabase.functions.invoke("parse-agreement", {
    body: { fileUrl, fileName },
  });
  if (error) throw error;
  return data?.parsed || {};
}

export async function uploadAgreementForParsing(file: File, organizationId?: string): Promise<{ fileUrl: string; fileName: string }> {
  const ext = file.name.split(".").pop() || "pdf";
  const prefix = organizationId ? `${organizationId}/` : "";
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("agreements").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("agreements").getPublicUrl(path);
  return { fileUrl: data.publicUrl, fileName: file.name };
}
