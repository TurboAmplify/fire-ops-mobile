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
}

/** Paid records for a given pay period (yyyy-MM-dd strings). */
export function usePayrollPayments(periodStart: string | null, periodEnd: string | null) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["payroll-payments", orgId, periodStart, periodEnd],
    queryFn: async () => {
      let q = supabase
        .from("payroll_payments")
        .select("id, crew_member_id, period_start, period_end, amount, paystub_sent_via, paid_at")
        .eq("organization_id", orgId!);
      if (periodStart && periodEnd) {
        q = q.eq("period_start", periodStart).eq("period_end", periodEnd);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PayrollPayment[];
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
