import { supabase } from "@/integrations/supabase/client";

export interface ParsedReceipt {
  amount?: number;
  date?: string;
  category?: string;
  description?: string;
  vendor?: string;
  truck_reference?: string;
  incident_reference?: string;
}

export async function parseReceiptAI(imageUrl: string): Promise<ParsedReceipt> {
  const { data, error } = await supabase.functions.invoke("parse-receipt", {
    body: { imageUrl },
  });
  if (error) throw error;
  return data?.parsed || {};
}
