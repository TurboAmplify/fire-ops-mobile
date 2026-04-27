import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export interface OrgRoleDefaultRate {
  id?: string;
  organization_id: string;
  role: string;
  pay_method: "hourly" | "daily";
  hourly_rate: number | null;
  hw_rate: number | null;
  daily_rate: number | null;
}

/**
 * Per-role default pay rates set at the organization level. Crew members whose
 * compensation has `use_org_default_rate = true` resolve to these values at
 * payroll time, falling back to per-employee overrides when the toggle is off.
 *
 * Read access is allowed for any signed-in user inside the org (the payroll
 * aggregator needs them) — admin-only by RLS for write.
 */
export function useOrgRoleDefaultRates() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["org-role-default-rates", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OrgRoleDefaultRate[]> => {
      const { data, error } = await supabase
        .from("org_role_default_rates" as any)
        .select("id, organization_id, role, pay_method, hourly_rate, hw_rate, daily_rate")
        .eq("organization_id", orgId!);
      if (error) {
        // Non-admin readers will be blocked by RLS — that's fine, return empty.
        return [];
      }
      return ((data as any[]) ?? []) as OrgRoleDefaultRate[];
    },
  });
}

export function useSaveOrgRoleDefaultRate() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useMutation({
    mutationFn: async (row: Omit<OrgRoleDefaultRate, "organization_id" | "id">) => {
      assertOnlineForWrite();
      if (!orgId) throw new Error("No organization");
      const payload: any = {
        organization_id: orgId,
        role: row.role,
        pay_method: row.pay_method,
        hourly_rate: row.hourly_rate,
        hw_rate: row.hw_rate,
        daily_rate: row.daily_rate,
      };
      const { error } = await supabase
        .from("org_role_default_rates" as any)
        .upsert(payload, { onConflict: "organization_id,role" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-role-default-rates", orgId] });
      qc.invalidateQueries({ queryKey: ["crew-compensation"] });
    },
  });
}

export function useDeleteOrgRoleDefaultRate() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useMutation({
    mutationFn: async (role: string) => {
      assertOnlineForWrite();
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase
        .from("org_role_default_rates" as any)
        .delete()
        .eq("organization_id", orgId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-role-default-rates", orgId] });
    },
  });
}
