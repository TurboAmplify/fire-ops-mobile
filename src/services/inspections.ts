import { supabase } from "@/integrations/supabase/client";

export type InspectionItemStatus = "ok" | "issue" | "na";
export type InspectionStatus = "pass" | "issues" | "partial";

export interface InspectionTemplate {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface InspectionTemplateItem {
  id: string;
  template_id: string;
  label: string;
  sort_order: number;
}

export interface TruckInspection {
  id: string;
  truck_id: string;
  organization_id: string;
  incident_id: string | null;
  shift_id: string | null;
  template_id: string | null;
  performed_by_user_id: string | null;
  performed_by_name: string | null;
  performed_at: string;
  status: InspectionStatus;
  notes: string | null;
}

export interface TruckInspectionResult {
  id: string;
  inspection_id: string;
  item_label: string;
  status: InspectionItemStatus;
  notes: string | null;
  photo_url: string | null;
}

// ---- Templates ----
export async function listTemplates(orgId: string): Promise<InspectionTemplate[]> {
  const { data, error } = await supabase
    .from("inspection_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InspectionTemplate[];
}

export async function getDefaultTemplate(orgId: string): Promise<InspectionTemplate | null> {
  const { data, error } = await supabase
    .from("inspection_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as InspectionTemplate | null;
}

export async function createTemplate(orgId: string, name: string, isDefault = false): Promise<InspectionTemplate> {
  if (isDefault) {
    await supabase.from("inspection_templates").update({ is_default: false }).eq("organization_id", orgId);
  }
  const { data, error } = await supabase
    .from("inspection_templates")
    .insert({ organization_id: orgId, name, is_default: isDefault })
    .select()
    .single();
  if (error) throw error;
  return data as InspectionTemplate;
}

export async function updateTemplate(id: string, patch: Partial<Pick<InspectionTemplate, "name" | "is_default">>, orgId?: string) {
  if (patch.is_default && orgId) {
    await supabase.from("inspection_templates").update({ is_default: false }).eq("organization_id", orgId);
  }
  const { error } = await supabase.from("inspection_templates").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from("inspection_templates").delete().eq("id", id);
  if (error) throw error;
}

// ---- Template items ----
export async function listTemplateItems(templateId: string): Promise<InspectionTemplateItem[]> {
  const { data, error } = await supabase
    .from("inspection_template_items")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InspectionTemplateItem[];
}

export async function addTemplateItem(templateId: string, label: string, sortOrder: number): Promise<InspectionTemplateItem> {
  const { data, error } = await supabase
    .from("inspection_template_items")
    .insert({ template_id: templateId, label, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as InspectionTemplateItem;
}

export async function updateTemplateItem(id: string, patch: Partial<Pick<InspectionTemplateItem, "label" | "sort_order">>) {
  const { error } = await supabase.from("inspection_template_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplateItem(id: string) {
  const { error } = await supabase.from("inspection_template_items").delete().eq("id", id);
  if (error) throw error;
}

// ---- Inspections ----
export async function listInspectionsForTruck(truckId: string, limit = 20): Promise<TruckInspection[]> {
  const { data, error } = await supabase
    .from("truck_inspections")
    .select("*")
    .eq("truck_id", truckId)
    .order("performed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TruckInspection[];
}

export async function getLastInspection(truckId: string): Promise<TruckInspection | null> {
  const { data, error } = await supabase
    .from("truck_inspections")
    .select("*")
    .eq("truck_id", truckId)
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TruckInspection | null;
}

export async function getInspectionResults(inspectionId: string): Promise<TruckInspectionResult[]> {
  const { data, error } = await supabase
    .from("truck_inspection_results")
    .select("*")
    .eq("inspection_id", inspectionId);
  if (error) throw error;
  return (data ?? []) as TruckInspectionResult[];
}

export interface SubmitInspectionInput {
  truckId: string;
  organizationId: string;
  templateId: string | null;
  performedByUserId: string | null;
  performedByName: string | null;
  incidentId?: string | null;
  shiftId?: string | null;
  notes?: string | null;
  results: Array<{
    item_label: string;
    status: InspectionItemStatus;
    notes?: string | null;
    photo_url?: string | null;
  }>;
}

export async function submitInspection(input: SubmitInspectionInput): Promise<TruckInspection> {
  const issuesCount = input.results.filter((r) => r.status === "issue").length;
  const status: InspectionStatus = issuesCount === 0 ? "pass" : "issues";

  const { data: inspection, error: insErr } = await supabase
    .from("truck_inspections")
    .insert({
      truck_id: input.truckId,
      organization_id: input.organizationId,
      template_id: input.templateId,
      performed_by_user_id: input.performedByUserId,
      performed_by_name: input.performedByName,
      incident_id: input.incidentId ?? null,
      shift_id: input.shiftId ?? null,
      notes: input.notes ?? null,
      status,
    })
    .select()
    .single();
  if (insErr) throw insErr;

  if (input.results.length) {
    const { error: resErr } = await supabase.from("truck_inspection_results").insert(
      input.results.map((r) => ({
        inspection_id: (inspection as any).id,
        item_label: r.item_label,
        status: r.status,
        notes: r.notes ?? null,
        photo_url: r.photo_url ?? null,
      })),
    );
    if (resErr) throw resErr;
  }

  return inspection as TruckInspection;
}

// ---- Due logic ----
/**
 * Returns true if a walk-around is due for this truck.
 * Due if:
 *  - never inspected, OR
 *  - last inspection is older than the latest completed shift's end_time, OR
 *  - last inspection is older than local midnight (when no shifts exist)
 */
export async function isInspectionDueForTruck(truckId: string): Promise<boolean> {
  const last = await getLastInspection(truckId);
  if (!last) return true;
  const lastAt = new Date(last.performed_at).getTime();

  // Latest shift end across all incident_trucks for this truck
  const { data: itRows } = await supabase
    .from("incident_trucks")
    .select("id")
    .eq("truck_id", truckId);
  const itIds = (itRows ?? []).map((r: any) => r.id);

  let latestShiftEnd: number | null = null;
  if (itIds.length) {
    const { data: shiftRows } = await supabase
      .from("shifts")
      .select("end_time")
      .in("incident_truck_id", itIds)
      .not("end_time", "is", null)
      .order("end_time", { ascending: false })
      .limit(1);
    if (shiftRows && shiftRows.length && shiftRows[0].end_time) {
      latestShiftEnd = new Date(shiftRows[0].end_time as string).getTime();
    }
  }

  if (latestShiftEnd !== null) {
    return lastAt < latestShiftEnd;
  }

  // No shifts → use local midnight
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return lastAt < midnight.getTime();
}

// ---- Photo upload ----
export async function uploadInspectionPhoto(file: File, truckId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${truckId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("inspection-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("inspection-photos").getPublicUrl(path);
  return data.publicUrl;
}
