import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export interface PayrollAdjustmentRow {
  id: string;
  organization_id: string;
  crew_member_id: string;
  incident_id: string | null;
  adjustment_date: string;
  adjustment_type: "hours" | "flat";
  hours: number | null;
  amount: number | null;
  reason: string;
  created_by_user_id: string | null;
  created_at: string;
}

export interface NewPayrollAdjustment {
  crew_member_id: string;
  incident_id: string | null;
  adjustment_date: string;
  adjustment_type: "hours" | "flat";
  hours: number | null;
  amount: number | null;
  reason: string;
}

export function usePayrollAdjustments() {
  const { membership, isAdmin } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["payroll-adjustments", orgId],
    enabled: !!orgId && isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<PayrollAdjustmentRow[]> => {
      const { data, error } = await supabase
        .from("payroll_adjustments" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("adjustment_date", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useCreatePayrollAdjustment() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useMutation({
    mutationFn: async (input: NewPayrollAdjustment) => {
      assertOnlineForWrite();
      if (!orgId) throw new Error("No organization");
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;

      const { error } = await supabase.from("payroll_adjustments" as any).insert({
        organization_id: orgId,
        crew_member_id: input.crew_member_id,
        incident_id: input.incident_id,
        adjustment_date: input.adjustment_date,
        adjustment_type: input.adjustment_type,
        hours: input.adjustment_type === "hours" ? input.hours : null,
        amount: input.adjustment_type === "flat" ? input.amount : null,
        reason: input.reason,
        created_by_user_id: userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-adjustments", orgId] });
    },
  });
}

export function useDeletePayrollAdjustment() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      assertOnlineForWrite();
      const { error } = await supabase.from("payroll_adjustments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-adjustments", orgId] });
    },
  });
}

/**
 * Selector for adjustments that belong to a single shift ticket's scope:
 * same incident, dates within the ticket, and crew members on the ticket.
 * Used by the post-script "Pay Adjustments" section on the shift ticket form
 * and the chip indicators on shift ticket lists.
 */
export function useTicketAdjustments(params: {
  incidentId: string | null | undefined;
  dates: string[];
  crewMemberIds: string[];
  enabled?: boolean;
}) {
  const { data: all } = usePayrollAdjustments();
  const dateSet = new Set(params.dates.filter(Boolean));
  const crewSet = new Set(params.crewMemberIds.filter(Boolean));
  const filtered = (all ?? []).filter((a) => {
    if (params.incidentId && a.incident_id !== params.incidentId) return false;
    if (dateSet.size > 0 && !dateSet.has(a.adjustment_date)) return false;
    if (crewSet.size > 0 && !crewSet.has(a.crew_member_id)) return false;
    return true;
  });
  return filtered;
}
