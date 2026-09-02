import { supabase } from "@/integrations/supabase/client";

/**
 * Owner-only factoring / payment status for incidents.
 *
 * All writes go through the single `set_incident_financial_status` RPC so the
 * business rules (authorization, roll-up guard, audit trail) live in one place
 * and every trigger path — UI, edge function, assistant/API — behaves the same.
 * Automatic marking is handled database-side by a trigger on
 * `factoring_submissions`, so any Schedule of Accounts recorded by the app
 * marks its incident Factored / Outstanding.
 */

export type FinancialStatus = "not_factored" | "factored" | "paid";

export const FINANCIAL_LABELS: Record<FinancialStatus, string> = {
  not_factored: "Not Factored",
  factored: "Factored / Outstanding",
  paid: "Paid / Complete",
};

export const FINANCIAL_SHORT: Record<FinancialStatus, string> = {
  not_factored: "Not Factored",
  factored: "Outstanding",
  paid: "Paid",
};

export const FINANCIAL_COLORS: Record<FinancialStatus, string> = {
  not_factored: "bg-secondary text-muted-foreground",
  factored: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export interface IncidentFinancialRow {
  id: string;
  organization_id: string;
  incident_id: string;
  status: FinancialStatus;
  factored_at: string | null;
  paid_at: string | null;
  last_schedule_number: number | null;
  factor_name: string | null;
  amount_submitted: number | null;
  invoice_numbers: string[];
  last_source: string | null;
  notes: string | null;
  set_by_user_id: string | null;
  updated_at: string;
}

export interface IncidentFinancialEvent {
  id: string;
  incident_id: string;
  from_status: FinancialStatus | null;
  to_status: FinancialStatus;
  source: string;
  schedule_number: number | null;
  factor_name: string | null;
  amount: number | null;
  notes: string | null;
  actor_user_id: string | null;
  created_at: string;
}

/** True when the signed-in user has owner-finance access for this org. */
export async function checkFinanceAccess(orgId: string): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase.rpc("is_org_finance" as any, {
    _user_id: uid,
    _org_id: orgId,
  });
  if (error) return false;
  return data === true;
}

/** Status rows for a whole org (RLS returns nothing for unauthorized users). */
export async function fetchOrgFinancialStatuses(orgId: string): Promise<IncidentFinancialRow[]> {
  const { data, error } = await supabase
    .from("incident_financial_status" as any)
    .select("*")
    .eq("organization_id", orgId);
  if (error) throw error;
  return (data ?? []) as unknown as IncidentFinancialRow[];
}

export async function fetchIncidentFinancialStatus(
  incidentId: string,
): Promise<IncidentFinancialRow | null> {
  const { data, error } = await supabase
    .from("incident_financial_status" as any)
    .select("*")
    .eq("incident_id", incidentId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as IncidentFinancialRow | null) ?? null;
}

export async function fetchIncidentFinancialEvents(
  incidentId: string,
): Promise<IncidentFinancialEvent[]> {
  const { data, error } = await supabase
    .from("incident_financial_events" as any)
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as IncidentFinancialEvent[];
}

export interface SetStatusArgs {
  incidentId: string;
  status: FinancialStatus;
  notes?: string | null;
  /** Where the change came from: manual, schedule_submission, assistant, api… */
  source?: string;
  /** Close an incident even if factored schedules still have reserve outstanding. */
  force?: boolean;
}

/** The single write path for incident financial status. */
export async function setIncidentFinancialStatus(args: SetStatusArgs) {
  const { data, error } = await supabase.rpc("set_incident_financial_status" as any, {
    _incident_id: args.incidentId,
    _status: args.status,
    _notes: args.notes ?? null,
    _source: args.source ?? "manual",
    _force: args.force ?? false,
  });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("outstanding_submissions")) {
      const n = m.split(":")[1]?.trim() ?? "";
      throw new Error(
        `Still outstanding: ${n} factored schedule(s) on this incident have reserve that hasn't been released yet.`,
      );
    }
    if (m.includes("not_authorized")) throw new Error("You don't have finance access for this organization.");
    throw error;
  }
  return data as unknown as IncidentFinancialRow;
}
