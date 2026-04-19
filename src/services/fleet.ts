import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Truck = Tables<"trucks">;
export type TruckInsert = TablesInsert<"trucks">;
export type TruckUpdate = TablesUpdate<"trucks">;

export type TruckStatus = "available" | "deployed" | "maintenance" | "needs_attention";

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  available: "Available",
  deployed: "Deployed",
  maintenance: "Maintenance",
  needs_attention: "Needs Attention",
};

export async function fetchTrucks(orgId?: string | null) {
  let query = supabase.from("trucks").select("*").order("name");
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;
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
  title: "Title",
  inspection: "Inspection Certificate",
  permit: "Permit",
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
  // Exterior walk-around
  "Tires inspected (tread depth & pressure - all axles)",
  "Lug nuts torqued / no missing",
  "Spare tire present & inflated",
  "Lights working (headlights, taillights, brake lights)",
  "Turn signals working (front & rear)",
  "Strobes / warning lights working",
  "Mirrors clean, adjusted & secure",
  "Windshield clean, no cracks",
  "Wiper blades in good condition",
  "Body / frame -- no visible damage or rust",
  "License plate visible & current",
  "Mud flaps / splash guards intact",
  "Trailer hitch / pintle hook (if equipped)",
  "Steps / running boards secure",
  "Fuel cap secure",
  "Exhaust system -- no leaks or damage",
  // Fluids & engine
  "Engine oil level checked",
  "Coolant level checked",
  "Transmission fluid level checked",
  "Brake fluid level checked",
  "Power steering fluid checked",
  "Windshield washer fluid filled",
  "DEF fluid level (if diesel)",
  "No visible fluid leaks under vehicle",
  "Belts inspected (serpentine / drive belts)",
  "Hoses inspected -- no cracks or bulges",
  "Air filter condition checked",
  "Battery terminals clean & secure",
  // Brakes & steering
  "Brake pedal feel / response tested",
  "Parking brake holds on grade",
  "Steering play within limits",
  // Fire / water system
  "Pump operational -- primed & tested",
  "Hoses inspected & connected",
  "Nozzles accounted for & functional",
  "Water tank level checked",
  "Water tank valves -- no leaks",
  "Foam / retardant supply checked",
  "Hard suction hose on board",
  "Discharge caps in place",
  // Safety equipment
  "Fire extinguisher(s) charged & current",
  "First aid kit stocked",
  "PPE gear on board (hard hat, gloves, goggles)",
  "Nomex / fire-resistant clothing",
  "Fire shelter(s) on board",
  "Reflective triangles / flares",
  "Chock blocks present",
  "Chains / tow strap on board",
  "Shovel, axe, Pulaski on board",
  // Communications
  "Radio tested -- transmit & receive",
  "Spare radio batteries charged",
  "Cell phone charger in cab",
  "GPS / navigation functional",
  "Sirens / PA working",
  // Compliance & documentation
  "DOT card current & on board",
  "Registration current & on board",
  "Insurance card on board",
  "Driver license valid",
  "Medical card current (if CDL)",
  "Driver log / ELD ready",
  "Pre-trip inspection form signed",
  "Vehicle accident kit on board",
  // Cab interior
  "Seatbelts working (all positions)",
  "Horn working",
  "HVAC / defroster working",
  "Dash gauges / warning lights normal",
  "Fuel level adequate for assignment",
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

export async function resetChecklist(truckId: string) {
  const { error } = await supabase
    .from("truck_checklist_items")
    .update({ is_complete: false })
    .eq("truck_id", truckId);
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

// --- Service / Maintenance Logs ---

export type TruckServiceLog = Tables<"truck_service_logs">;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change",
  tire_rotation: "Tire Rotation",
  brake_service: "Brake Service",
  pump_service: "Pump Service",
  transmission: "Transmission Service",
  coolant_flush: "Coolant Flush",
  filter_replace: "Filter Replacement",
  belt_hose: "Belt / Hose Replacement",
  electrical: "Electrical Repair",
  body_repair: "Body / Frame Repair",
  inspection: "Annual Inspection",
  dot_inspection: "DOT Inspection",
  general_repair: "General Repair",
  other: "Other",
};

export async function fetchServiceLogs(truckId: string) {
  const { data, error } = await supabase
    .from("truck_service_logs")
    .select("*")
    .eq("truck_id", truckId)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createServiceLog(log: {
  truck_id: string;
  organization_id: string;
  service_type: string;
  description?: string;
  mileage?: number;
  cost?: number;
  performed_at: string;
  performed_by?: string;
  next_due_at?: string;
  next_due_mileage?: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("truck_service_logs")
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteServiceLog(id: string) {
  const { error } = await supabase
    .from("truck_service_logs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateTruckPhotoLabel(id: string, photoLabel: string) {
  const { error } = await supabase
    .from("truck_photos")
    .update({ photo_label: photoLabel })
    .eq("id", id);
  if (error) throw error;
}

// --- Truck Hero Photo ---

export async function updateTruckHeroPhoto(
  truckId: string,
  organizationId: string,
  file: File
) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${organizationId}/${truckId}/hero_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("truck-photos")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("truck-photos")
    .getPublicUrl(path);

  const { error } = await supabase
    .from("trucks")
    .update({ photo_url: urlData.publicUrl } as any)
    .eq("id", truckId);
  if (error) throw error;

  return urlData.publicUrl;
}

export async function deleteTruckHeroPhoto(truckId: string) {
  const { error } = await supabase
    .from("trucks")
    .update({ photo_url: null } as any)
    .eq("id", truckId);
  if (error) throw error;
}

// --- AI Photo Parsing ---

export type ParsedTruckPhoto = {
  vin?: string | null;
  license_plate?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  registration_expires?: string | null;
  detected_document_type?: "vin_plate" | "registration" | "license_plate" | "vehicle" | "other";
};

export async function parseTruckPhoto(fileUrl: string): Promise<ParsedTruckPhoto> {
  const { data, error } = await supabase.functions.invoke("parse-truck-photo", {
    body: { fileUrl },
  });
  if (error) {
    // Surface friendly error from edge function body if present
    const msg = (error as any)?.context?.body
      ? await (error as any).context.text?.().catch(() => null)
      : null;
    throw new Error(msg || error.message || "Failed to scan photo");
  }
  return (data?.parsed ?? {}) as ParsedTruckPhoto;
}

export const DOCUMENT_TYPE_TO_LABEL: Record<string, string> = {
  vin_plate: "VIN Plate",
  registration: "Registration",
  license_plate: "Plate",
  vehicle: "Exterior",
  other: "Other",
};

