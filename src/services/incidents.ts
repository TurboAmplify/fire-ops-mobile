import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Incident = Tables<"incidents">;
export type IncidentInsert = TablesInsert<"incidents">;
export type IncidentUpdate = TablesUpdate<"incidents">;

export type IncidentStatus = "active" | "contained" | "controlled" | "out";
export type IncidentType = "wildfire" | "prescribed" | "structure" | "other";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  active: "Active",
  contained: "Contained",
  controlled: "Controlled",
  out: "Out",
};

export const TYPE_LABELS: Record<IncidentType, string> = {
  wildfire: "Wildfire",
  prescribed: "Prescribed Burn",
  structure: "Structure Fire",
  other: "Other",
};

export async function fetchIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchIncident(id: string) {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createIncident(incident: IncidentInsert) {
  const { data, error } = await supabase
    .from("incidents")
    .insert(incident)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIncident(id: string, updates: IncidentUpdate) {
  const { data, error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
