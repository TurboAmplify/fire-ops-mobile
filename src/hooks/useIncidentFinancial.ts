import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import {
  checkFinanceAccess,
  fetchIncidentFinancialEvents,
  fetchIncidentFinancialStatus,
  fetchOrgFinancialStatuses,
  setIncidentFinancialStatus,
  type FinancialStatus,
  type SetStatusArgs,
} from "@/services/incident-financial";

/** Owner-finance permission for the active org. */
export function useFinanceAccess() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const q = useQuery({
    queryKey: ["finance-access", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: () => checkFinanceAccess(orgId!),
  });
  return { hasFinanceAccess: q.data === true, isLoading: q.isLoading };
}

/** Map of incident_id → status for the whole org (finance users only). */
export function useOrgFinancialStatuses() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const { hasFinanceAccess } = useFinanceAccess();
  return useQuery({
    queryKey: ["incident-financial-statuses", orgId],
    enabled: !!orgId && hasFinanceAccess,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchOrgFinancialStatuses(orgId!);
      const map = new Map<string, FinancialStatus>();
      for (const r of rows) map.set(r.incident_id, r.status);
      return map;
    },
  });
}

export function useIncidentFinancialStatus(incidentId: string | undefined) {
  const { hasFinanceAccess } = useFinanceAccess();
  return useQuery({
    queryKey: ["incident-financial-status", incidentId],
    enabled: !!incidentId && hasFinanceAccess,
    queryFn: () => fetchIncidentFinancialStatus(incidentId!),
  });
}

export function useIncidentFinancialEvents(incidentId: string | undefined) {
  const { hasFinanceAccess } = useFinanceAccess();
  return useQuery({
    queryKey: ["incident-financial-events", incidentId],
    enabled: !!incidentId && hasFinanceAccess,
    queryFn: () => fetchIncidentFinancialEvents(incidentId!),
  });
}

export function useSetIncidentFinancialStatus() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useMutation({
    mutationFn: (args: SetStatusArgs) => setIncidentFinancialStatus(args),
    onSuccess: (_row, args) => {
      qc.invalidateQueries({ queryKey: ["incident-financial-status", args.incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-financial-events", args.incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-financial-statuses", orgId] });
      toast.success("Financial status updated");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Could not update financial status");
    },
  });
}
