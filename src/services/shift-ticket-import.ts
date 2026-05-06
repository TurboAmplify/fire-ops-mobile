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
  contractor_signed_date?: string;
  supervisor_signed_date?: string;
  contractor_signature_box?: { x: number; y: number; w: number; h: number };
  supervisor_signature_box?: { x: number; y: number; w: number; h: number };
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

/**
 * Crop a normalized 0..1 bounding box out of an image File and return it as
 * a PNG Blob with a transparent-ish white background. Adds a small padding
 * margin so the signature isn't crammed against the edges.
 *
 * Returns null if the file isn't an image (e.g. PDF) or the box is invalid.
 */
export async function cropSignatureFromImage(
  file: File,
  box: { x: number; y: number; w: number; h: number },
  padding = 0.01
): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  const { x, y, w, h } = box;
  if (![x, y, w, h].every((n) => typeof n === "number" && isFinite(n))) return null;
  if (w <= 0 || h <= 0) return null;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const px = Math.max(0, (x - padding)) * bitmap.width;
  const py = Math.max(0, (y - padding)) * bitmap.height;
  const pw = Math.min(1, w + padding * 2) * bitmap.width;
  const ph = Math.min(1, h + padding * 2) * bitmap.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pw));
  canvas.height = Math.max(1, Math.round(ph));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // White background so the signature reads cleanly in the PDF.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    bitmap,
    Math.round(px), Math.round(py), Math.round(pw), Math.round(ph),
    0, 0, canvas.width, canvas.height
  );
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.92)
  );
}
