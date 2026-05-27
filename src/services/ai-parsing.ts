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

interface ParseOptions {
  /** Inline base64 data URL (data:image/jpeg;base64,...). Skips the edge function's re-download. */
  imageDataUrl?: string;
  /** Storage URL fallback used when no inline data is available. */
  imageUrl?: string;
}

async function buildBody(opts: ParseOptions) {
  if (opts.imageDataUrl) return { imageDataUrl: opts.imageDataUrl };
  if (!opts.imageUrl) throw new Error("imageUrl or imageDataUrl is required");
  const resolved = (await getViewableUrl(opts.imageUrl)) ?? opts.imageUrl;
  return { imageUrl: resolved };
}

export async function parseReceiptAI(
  imageOrOpts: string | ParseOptions
): Promise<ParsedReceipt> {
  const opts: ParseOptions = typeof imageOrOpts === "string" ? { imageUrl: imageOrOpts } : imageOrOpts;
  const body = await buildBody(opts);
  const { data, error } = await supabase.functions.invoke("parse-receipt", { body });
  if (error) throw error;
  return data?.parsed || {};
}

export async function parseBatchReceiptsAI(
  imageOrOpts: string | ParseOptions
): Promise<ParsedReceipt[]> {
  const opts: ParseOptions = typeof imageOrOpts === "string" ? { imageUrl: imageOrOpts } : imageOrOpts;
  const body = await buildBody(opts);
  const { data, error } = await supabase.functions.invoke("parse-batch-receipts", { body });
  if (error) throw error;
  return Array.isArray(data?.receipts) ? data.receipts : [];
}

export interface ParsedRedCard {
  card_id?: string;
  agency?: string;
  primary_position?: string;
  work_capacity_test?: string;
  fitness_test_date?: string;
  rt130_refresher_status?: string;
  issue_date?: string;
  review_expiration_date?: string;
  signer_name?: string;
  signer_title?: string;
  restrictions_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  return_address?: string;
  qualifications?: { qualification: string; code: string; status: string }[];
}

export async function parseRedCardAI(
  imageOrOpts: string | ParseOptions
): Promise<ParsedRedCard> {
  const opts: ParseOptions = typeof imageOrOpts === "string" ? { imageUrl: imageOrOpts } : imageOrOpts;
  const body = await buildBody(opts);
  const { data, error } = await supabase.functions.invoke("parse-red-card", { body });
  if (error) throw error;
  return data?.parsed || {};
}

