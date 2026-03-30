import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Truck = Tables<"trucks">;
export type TruckInsert = TablesInsert<"trucks">;
export type TruckUpdate = TablesUpdate<"trucks">;

export type TruckStatus = "available" | "deployed" | "maintenance";

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  available: "Available",
  deployed: "Deployed",
  maintenance: "Maintenance",
};

export async function fetchTrucks() {
  const { data, error } = await supabase
    .from("trucks")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchTruck(id: string) {
  const { data, error } = await supabase
    .from("trucks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTruck(truck: TruckInsert) {
  const { data, error } = await supabase
    .from("trucks")
    .insert(truck)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTruck(id: string, updates: TruckUpdate) {
  const { data, error } = await supabase
    .from("trucks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTruck(id: string) {
  const { count } = await supabase
    .from("incident_trucks")
    .select("*", { count: "exact", head: true })
    .eq("truck_id", id);

  if (count && count > 0) {
    throw new Error(
      `Cannot delete: this truck is assigned to ${count} incident(s). Remove assignments first.`
    );
  }

  const { error } = await supabase.from("trucks").delete().eq("id", id);
  if (error) throw error;
}

// --- Truck Photos ---

export type TruckPhoto = Tables<"truck_photos">;

export async function fetchTruckPhotos(truckId: string) {
  const { data, error } = await supabase
    .from("truck_photos")
    .select("*")
    .eq("truck_id", truckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadTruckPhoto(
  truckId: string,
  organizationId: string,
  file: File
) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${organizationId}/${truckId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("truck-photos")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("truck-photos")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("truck_photos")
    .insert({
      truck_id: truckId,
      organization_id: organizationId,
      file_url: urlData.publicUrl,
      file_name: file.name,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTruckPhoto(id: string) {
  const { error } = await supabase.from("truck_photos").delete().eq("id", id);
  if (error) throw error;
}

// --- Truck Documents ---

export type TruckDocument = Tables<"truck_documents">;

export const DOC_TYPE_LABELS: Record<string, string> = {
  registration: "Registration",
  dot: "DOT / Licensing",
  insurance: "Insurance",
  other: "Other",
};

export async function fetchTruckDocuments(truckId: string) {
  const { data, error } = await supabase
    .from("truck_documents")
    .select("*")
    .eq("truck_id", truckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadTruckDocument(
  truckId: string,
  organizationId: string,
  file: File,
  docType: string,
  title?: string
) {
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${organizationId}/${truckId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("truck-documents")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("truck-documents")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("truck_documents")
    .insert({
      truck_id: truckId,
      organization_id: organizationId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      doc_type: docType,
      title: title || file.name,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTruckDocument(id: string) {
  const { error } = await supabase.from("truck_documents").delete().eq("id", id);
  if (error) throw error;
}

// --- Truck Checklist ---

export type TruckChecklistItem = Tables<"truck_checklist_items">;

export const DEFAULT_CHECKLIST_ITEMS = [
  "Tires inspected",
  "Oil / fluids checked",
  "Pump operational",
  "Hoses inspected",
  "Lights / sirens working",
  "Radio tested",
  "First aid kit stocked",
  "Fire extinguisher charged",
  "DOT card current",
  "Registration current",
];

export async function fetchTruckChecklist(truckId: string) {
  const { data, error } = await supabase
    .from("truck_checklist_items")
    .select("*")
    .eq("truck_id", truckId)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function addChecklistItem(
  truckId: string,
  organizationId: string,
  label: string,
  sortOrder: number = 0
) {
  const { data, error } = await supabase
    .from("truck_checklist_items")
    .insert({
      truck_id: truckId,
      organization_id: organizationId,
      label,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleChecklistItem(id: string, isComplete: boolean) {
  const { error } = await supabase
    .from("truck_checklist_items")
    .update({ is_complete: isComplete })
    .eq("id", id);
  if (error) throw error;
}

export async function updateChecklistItemNotes(id: string, notes: string) {
  const { error } = await supabase
    .from("truck_checklist_items")
    .update({ notes })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const { error } = await supabase
    .from("truck_checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function initializeDefaultChecklist(
  truckId: string,
  organizationId: string
) {
  const items = DEFAULT_CHECKLIST_ITEMS.map((label, i) => ({
    truck_id: truckId,
    organization_id: organizationId,
    label,
    sort_order: i,
  }));
  const { error } = await supabase.from("truck_checklist_items").insert(items);
  if (error) throw error;
}
