import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type ExpenseCategory = "fuel" | "ppe" | "food" | "lodging" | "equipment" | "supplies" | "other";
export type FuelType = "truck" | "pump" | "saw" | "burn";
export type ExpenseType = "company" | "reimbursement";
export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  ppe: "PPE",
  food: "Food",
  lodging: "Lodging",
  equipment: "Equipment",
  supplies: "Supplies",
  other: "Other",
};

// Icon mapping moved to component layer — see CategoryIcon component
// Kept for backward compat as empty; consumers should use CategoryIcon instead
import { Fuel, ShieldCheck, UtensilsCrossed, Hotel, Wrench, Box, Package, type LucideIcon } from "lucide-react";

export const CATEGORY_ICON_MAP: Record<ExpenseCategory, LucideIcon> = {
  fuel: Fuel,
  ppe: ShieldCheck,
  food: UtensilsCrossed,
  lodging: Hotel,
  equipment: Wrench,
  supplies: Box,
  other: Package,
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  truck: "Truck",
  pump: "Pump",
  saw: "Saw",
  burn: "Burn",
};

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
};

export const STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  approved: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  rejected: "bg-destructive/10 text-destructive",
  reimbursed: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
};

export type AttachmentScope = "company" | "incident" | "truck";

export const SCOPE_LABELS: Record<AttachmentScope, string> = {
  company: "Company / General",
  incident: "Incident",
  truck: "Incident + Truck",
};

export type ExpenseWithRelations = Expense & {
  incidents: { id: string; name: string } | null;
  incident_trucks: { id: string; trucks: { id: string; name: string } } | null;
};

export async function fetchExpenses(orgId?: string | null) {
  let query = supabase
    .from("expenses")
    .select("*, incidents:incident_id(id, name), incident_trucks:incident_truck_id(id, trucks(id, name))")
    .order("date", { ascending: false });
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;
  if (error) throw error;
  return data as ExpenseWithRelations[];
}

export async function fetchExpense(id: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, incidents:incident_id(id, name), incident_trucks:incident_truck_id(id, trucks(id, name))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ExpenseWithRelations | null;
}

export async function createExpense(expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

/** Formats the AI vision endpoint reliably accepts. */
const AI_SAFE_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Keep inline payloads comfortably under the edge function's 10MB base64 cap. */
export const MAX_INLINE_DATA_URL_BYTES = 7 * 1024 * 1024;

/** Thrown when a photo cannot be decoded at all (e.g. HEIC on a browser without support). */
export class UnreadableImageError extends Error {
  readonly isUnreadableImage = true;
  constructor(message = "Couldn't read that photo. Try taking it again, or set your camera to \"Most Compatible\" (JPEG).") {
    super(message);
    this.name = "UnreadableImageError";
  }
}

type Drawable = CanvasImageSource & { width: number; height: number };

/**
 * Decode an image blob to something we can draw. Tries createImageBitmap first
 * (fast, works for JPEG/PNG/WebP everywhere) and falls back to an <img>
 * element, which is what makes HEIC/HEIF work on iOS Safari / WKWebView.
 */
async function decodeImageBlob(file: Blob): Promise<Drawable> {
  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width > 0 && bmp.height > 0) return bmp as unknown as Drawable;
  } catch {
    // fall through to the <img> path
  }

  if (typeof document === "undefined") throw new UnreadableImageError();
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new UnreadableImageError());
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new UnreadableImageError();
    return img as unknown as Drawable;
  } finally {
    // Give the decoder/draw a moment before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }
}

async function canvasToJpeg(canvas: OffscreenCanvas | HTMLCanvasElement, quality: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  return await new Promise<Blob | null>((resolve) =>
    (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", quality)
  );
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Compress + downscale a receipt photo and ALWAYS return a web-safe JPEG when
 * the input is an image (HEIC from iPhone cameras included).
 *
 * Non-images (PDFs) pass through untouched. If the photo can't be decoded at
 * all we throw UnreadableImageError so the UI can tell the user what to do
 * instead of silently shipping bytes the AI can't read.
 *
 * The result is guaranteed to fit under MAX_INLINE_DATA_URL_BYTES so the
 * inline AI call can't be rejected with a 413.
 */
export async function compressImageForReceipt(
  file: File | Blob,
  maxEdge = 1600,
  quality = 0.82
): Promise<Blob> {
  const type = (file.type || "").toLowerCase();
  if (type && !type.startsWith("image/")) return file;

  const source = await decodeImageBlob(file);
  const srcW = source.width;
  const srcH = source.height;

  let edge = maxEdge;
  let q = quality;

  for (let attempt = 0; attempt < 5; attempt++) {
    const longest = Math.max(srcW, srcH);
    const scale = longest > edge ? edge / longest : 1;
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) break;
    ctx.drawImage(source, 0, 0, w, h);

    const blob = await canvasToJpeg(canvas, q);
    if (!blob || blob.size === 0) break;

    // Base64 inflates by ~4/3; make sure the encoded payload stays under cap.
    if (blob.size * 1.37 <= MAX_INLINE_DATA_URL_BYTES) {
      (source as ImageBitmap).close?.();
      return blob;
    }
    edge = Math.round(edge * 0.75);
    q = Math.max(0.5, q - 0.1);
  }

  (source as ImageBitmap).close?.();

  // Last resort: if the original is already a safe format and small enough, use it.
  if (AI_SAFE_MIME.includes(type) && file.size * 1.37 <= MAX_INLINE_DATA_URL_BYTES) return file;
  throw new UnreadableImageError("That photo is too large to process. Try a lower-resolution photo.");
}

/**
 * Read a Blob into a base64 data URL on the client.
 * Used to send the image inline to the parse edge function in parallel with Storage upload.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export async function uploadReceipt(
  file: File | Blob,
  organizationId?: string,
  filename?: string
): Promise<string> {
  if (!organizationId) {
    throw new Error("Cannot upload receipt without an organization");
  }
  // Trust the blob's own mime first — after compression the bytes are JPEG even
  // if the original filename said .heic. A mismatched content-type is what made
  // receipt thumbnails render as broken images.
  const blobType = (file.type || "").toLowerCase().split(";")[0].trim();
  const nameExt = (filename ?? (file instanceof File ? file.name : ""))
    .split(".")
    .pop()
    ?.toLowerCase();

  let contentType = blobType;
  if (!contentType) {
    contentType =
      nameExt === "png" ? "image/png"
      : nameExt === "webp" ? "image/webp"
      : nameExt === "pdf" ? "application/pdf"
      : "image/jpeg";
  }
  const ext = EXT_BY_MIME[contentType] ?? (nameExt && /^[a-z0-9]{2,5}$/.test(nameExt) ? nameExt : "jpg");

  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

