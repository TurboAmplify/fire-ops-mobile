import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export interface PayrollPayment {
  id: string;
  crew_member_id: string;
  period_start: string;
  period_end: string;
  amount: number | null;
  paystub_sent_via: string | null;
  paid_at: string;
  incident_id: string | null;
  incident_name: string | null;
}

const SELECT_COLS =
  "id, crew_member_id, period_start, period_end, amount, paystub_sent_via, paid_at, incident_id, incident_name";

/**
 * Paid records for a given pay period (yyyy-MM-dd strings).
 * When `incidentId` is given, only payroll runs for that fire count as paid —
 * that's how we track outstanding payroll per incident.
 */
export function usePayrollPayments(
  periodStart: string | null,
  periodEnd: string | null,
  incidentId?: string | null
) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["payroll-payments", orgId, periodStart, periodEnd, incidentId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("payroll_payments")
        .select(SELECT_COLS)
        .eq("organization_id", orgId!);
      if (periodStart && periodEnd) {
        q = q.eq("period_start", periodStart).eq("period_end", periodEnd);
      }
      if (incidentId) q = q.eq("incident_id", incidentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PayrollPayment[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 30,
    refetchOnMount: "always",
  });
}

/**
 * Every incident this org has already run payroll for — used to flag
 * outstanding fires in the "By Fire" picker.
 */
export function usePaidIncidentIds() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["payroll-payments", "incidents", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_payments")
        .select("incident_id")
        .eq("organization_id", orgId!)
        .not("incident_id", "is", null);
      if (error) throw error;
      return new Set((data ?? []).map((r: { incident_id: string | null }) => r.incident_id as string));
    },
    enabled: !!orgId,
    staleTime: 1000 * 30,
    refetchOnMount: "always",
  });
}

export function useTogglePayrollPaid() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vars: {
      existingId?: string | null;
      crewMemberId: string;
      periodStart: string;
      periodEnd: string;
      amount?: number | null;
      paystubSentVia?: string | null;
      incidentId?: string | null;
      incidentName?: string | null;
    }) => {
      assertOnlineForWrite();
      if (vars.existingId) {
        const { error } = await supabase.from("payroll_payments").delete().eq("id", vars.existingId);
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase
        .from("payroll_payments")
        .insert({
          organization_id: membership!.organizationId,
          crew_member_id: vars.crewMemberId,
          period_start: vars.periodStart,
          period_end: vars.periodEnd,
          amount: vars.amount ?? null,
          paystub_sent_via: vars.paystubSentVia ?? null,
          incident_id: vars.incidentId ?? null,
          incident_name: vars.incidentName ?? null,
          marked_by_user_id: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-payments"] });
    },
  });
}

/**
 * Bulk mark/unmark an entire payroll period complete. One tap for the whole
 * crew list currently on screen (field use: fewer taps, forgiving).
 */
export function useBulkMarkPayrollPaid() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vars: {
      periodStart: string;
      periodEnd: string;
      /** Everyone that should be marked paid (already-paid ones are skipped). */
      entries: { crewMemberId: string; amount?: number | null; paystubSentVia?: string | null }[];
      /** Payment row ids to remove when un-marking. */
      removeIds?: string[];
      mode: "pay" | "unpay";
      /** When the run is for a specific fire, stamp it so we can track it. */
      incidentId?: string | null;
      incidentName?: string | null;
    }) => {
      assertOnlineForWrite();
      if (vars.mode === "unpay") {
        if (!vars.removeIds?.length) return;
        const { error } = await supabase.from("payroll_payments").delete().in("id", vars.removeIds);
        if (error) throw error;
        return;
      }
      if (vars.entries.length === 0) return;
      const { error } = await supabase.from("payroll_payments").insert(
        vars.entries.map((e) => ({
          organization_id: membership!.organizationId,
          crew_member_id: e.crewMemberId,
          period_start: vars.periodStart,
          period_end: vars.periodEnd,
          amount: e.amount ?? null,
          paystub_sent_via: e.paystubSentVia ?? null,
          incident_id: vars.incidentId ?? null,
          incident_name: vars.incidentName ?? null,
          marked_by_user_id: user?.id ?? null,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-payments"] });
    },
  });
}
