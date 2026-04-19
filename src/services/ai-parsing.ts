import { supabase } from "@/integrations/supabase/client";
import { getViewableUrl } from "@/lib/storage-url";

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
  // Resolve to a short-lived signed URL so the edge function can fetch the file
  // from the now-private bucket.
  const resolved = (await getViewableUrl(imageUrl)) ?? imageUrl;
  const { data, error } = await supabase.functions.invoke("parse-receipt", {
    body: { imageUrl: resolved },
  });
  if (error) throw error;
  return data?.parsed || {};
}

export async function parseBatchReceiptsAI(imageUrl: string): Promise<ParsedReceipt[]> {
  const resolved = (await getViewableUrl(imageUrl)) ?? imageUrl;
  const { data, error } = await supabase.functions.invoke("parse-batch-receipts", {
    body: { imageUrl: resolved },
  });
  if (error) throw error;
  return Array.isArray(data?.receipts) ? data.receipts : [];
}
