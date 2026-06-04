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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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

/**
 * Soft-delete an incident. Sets deleted_at + deleted_by_user_id + deleted_reason.
 * The row stays in the database — all trucks, tickets, docs, threads, messages
 * remain intact and can be restored. Lists filter on deleted_at IS NULL.
 */
export async function softDeleteIncident(id: string, reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("incidents")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: user?.id ?? null,
      deleted_reason: reason ?? null,
    } as IncidentUpdate)
    .eq("id", id);
  if (error) throw error;
}

/** Back-compat name — same as softDeleteIncident. */
export const deleteIncident = softDeleteIncident;

export async function restoreIncident(id: string) {
  const { error } = await supabase
    .from("incidents")
    .update({
      deleted_at: null,
      deleted_by_user_id: null,
      deleted_reason: null,
    } as IncidentUpdate)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Permanently delete. Used only from the Trash page with explicit confirmation.
 * Will fail if FK-protected rows still reference the incident.
 */
export async function hardDeleteIncident(id: string) {
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTrashedIncidents(orgId?: string | null) {
  let query = supabase
    .from("incidents")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Counts of related rows for the delete-confirmation dialog. */
export async function fetchIncidentImpactCounts(id: string) {
  const trucksRes = await supabase
    .from("incident_trucks")
    .select("id", { count: "exact" })
    .eq("incident_id", id)
    .is("deleted_at", null);
  const truckIds = (trucksRes.data ?? []).map((r) => r.id);

  const ticketsCountPromise = truckIds.length
    ? supabase
        .from("shift_tickets")
        .select("id", { count: "exact", head: true })
        .in("incident_truck_id", truckIds)
    : Promise.resolve({ count: 0 } as { count: number | null });

  const [tickets, docs, expenses, threads] = await Promise.all([
    ticketsCountPromise,
    supabase.from("incident_documents").select("id", { count: "exact", head: true }).eq("incident_id", id),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("incident_id", id),
    supabase.from("communication_threads").select("id", { count: "exact", head: true }).eq("incident_id", id),
  ]);
  return {
    trucks: trucksRes.count ?? 0,
    tickets: tickets.count ?? 0,
    documents: docs.count ?? 0,
    expenses: expenses.count ?? 0,
    threads: threads.count ?? 0,
  };
}

