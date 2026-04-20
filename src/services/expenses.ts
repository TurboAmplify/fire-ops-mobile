import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export type ExpenseCategory = "fuel" | "ppe" | "food" | "lodging" | "equipment" | "other";
export type FuelType = "truck" | "pump" | "saw" | "burn";
export type ExpenseType = "company" | "reimbursement";
export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  ppe: "PPE",
  food: "Food",
  lodging: "Lodging",
  equipment: "Equipment",
  other: "Other",
};

// Icon mapping moved to component layer — see CategoryIcon component
// Kept for backward compat as empty; consumers should use CategoryIcon instead
import { Fuel, ShieldCheck, UtensilsCrossed, Hotel, Wrench, Package, type LucideIcon } from "lucide-react";

export const CATEGORY_ICON_MAP: Record<ExpenseCategory, LucideIcon> = {
  fuel: Fuel,
  ppe: ShieldCheck,
  food: UtensilsCrossed,
  lodging: Hotel,
  equipment: Wrench,
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

/**
 * Compress + downscale an image (or pass-through non-images like PDFs).
 * Resizes longest edge to maxEdge px, re-encodes as JPEG quality 0.82.
 * Receipts at 1600px are well above what vision models need for OCR — accuracy unchanged.
 * Returns the original file if compression fails or input isn't an image.
 */
export async function compressImageForReceipt(
  file: File,
  maxEdge = 1600,
  quality = 0.82
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas as OffscreenCanvas | HTMLCanvasElement).getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    let blob: Blob | null = null;
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    } else {
      blob = await new Promise<Blob | null>((resolve) =>
        (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", quality)
      );
    }
    if (!blob || blob.size === 0) return file;
    // If compression somehow made it bigger, keep original
    return blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
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

export async function uploadReceipt(
  file: File | Blob,
  organizationId?: string,
  filename?: string
): Promise<string> {
  if (!organizationId) {
    throw new Error("Cannot upload receipt without an organization");
  }
  const fallbackName = filename ?? (file instanceof File ? file.name : "receipt.jpg");
  const ext = (fallbackName.split(".").pop() || "jpg").toLowerCase();
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const contentType = (file as Blob).type || (ext === "png" ? "image/png" : "image/jpeg");
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}
