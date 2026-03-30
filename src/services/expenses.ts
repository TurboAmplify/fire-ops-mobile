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

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  fuel: "⛽",
  ppe: "🦺",
  food: "🍔",
  lodging: "🏨",
  equipment: "🔧",
  other: "📦",
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

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, incidents:incident_id(id, name), incident_trucks:incident_truck_id(id, trucks(id, name))")
    .order("date", { ascending: false });
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

export async function uploadReceipt(file: File, organizationId?: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const prefix = organizationId ? `${organizationId}/` : "";
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}
