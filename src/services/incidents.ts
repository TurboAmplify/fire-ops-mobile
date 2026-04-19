import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Incident = Tables<"incidents">;
export type IncidentInsert = TablesInsert<"incidents">;
export type IncidentUpdate = TablesUpdate<"incidents">;

export type IncidentStatus = "active" | "demob" | "closed";
export type IncidentType = "wildfire" | "prescribed" | "structure" | "other";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  active: "Active",
  demob: "Demob",
  closed: "Closed",
};

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  active: "bg-destructive/12 text-destructive",
  demob: "bg-amber-500/12 text-amber-600",
  closed: "bg-success/12 text-success",
};

export const TYPE_LABELS: Record<IncidentType, string> = {
  wildfire: "Wildfire",
  prescribed: "Prescribed Burn",
  structure: "Structure Fire",
  other: "Other",
};

export async function fetchIncidents(orgId?: string | null) {
  let query = supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;
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

export async function deleteIncident(id: string) {
  const { count } = await supabase
    .from("incident_trucks")
    .select("*", { count: "exact", head: true })
    .eq("incident_id", id);

  if (count && count > 0) {
    throw new Error(
      `Cannot delete: this incident has ${count} assigned truck(s). Remove truck assignments first.`
    );
  }

  const { count: expenseCount } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("incident_id", id);

  if (expenseCount && expenseCount > 0) {
    throw new Error(
      `Cannot delete: this incident has ${expenseCount} expense(s). Remove expenses first.`
    );
  }

  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) throw error;
}
