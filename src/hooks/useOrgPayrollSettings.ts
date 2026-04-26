import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DEFAULT_ORG_PAYROLL, type OrgPayrollDefaults } from "@/lib/payroll";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useOrgPayrollSettings() {
  const { membership, isAdmin } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  const query = useQuery({
    queryKey: ["org-payroll-settings", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async (): Promise<OrgPayrollDefaults> => {
      const { data, error } = await supabase
        .from("org_payroll_settings" as any)
        .select("federal_pct, social_security_pct, medicare_pct, state_pct, state_enabled, extra_withholding_default, workers_comp_pct, factoring_pct, factoring_enabled")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULT_ORG_PAYROLL };
      const d = data as any;
      return {
        federal_pct: Number(d.federal_pct ?? DEFAULT_ORG_PAYROLL.federal_pct),
        social_security_pct: Number(d.social_security_pct ?? DEFAULT_ORG_PAYROLL.social_security_pct),
        medicare_pct: Number(d.medicare_pct ?? DEFAULT_ORG_PAYROLL.medicare_pct),
        state_pct: Number(d.state_pct ?? 0),
        state_enabled: !!d.state_enabled,
        extra_withholding_default: Number(d.extra_withholding_default ?? 0),
        workers_comp_pct: Number(d.workers_comp_pct ?? DEFAULT_ORG_PAYROLL.workers_comp_pct),
        factoring_pct: Number(d.factoring_pct ?? DEFAULT_ORG_PAYROLL.factoring_pct),
        factoring_enabled: d.factoring_enabled ?? DEFAULT_ORG_PAYROLL.factoring_enabled,
      };
    },
  });

  return query;
}

export function useSaveOrgPayrollSettings() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useMutation({
    mutationFn: async (values: OrgPayrollDefaults) => {
      assertOnlineForWrite();
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase.from("org_payroll_settings" as any).upsert(
        {
          organization_id: orgId,
          federal_pct: values.federal_pct,
          social_security_pct: values.social_security_pct,
          medicare_pct: values.medicare_pct,
          state_pct: values.state_pct,
          state_enabled: values.state_enabled,
          extra_withholding_default: values.extra_withholding_default,
          workers_comp_pct: values.workers_comp_pct,
          factoring_pct: values.factoring_pct,
          factoring_enabled: values.factoring_enabled,
        } as any,
        { onConflict: "organization_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-payroll-settings", orgId] });
    },
  });
}

export function useCrewWithholdingProfiles() {
  const { membership, isAdmin } = useOrganization();
  const orgId = membership?.organizationId ?? null;

  return useQuery({
    queryKey: ["crew-withholding-profiles", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_compensation" as any)
        .select(
          "crew_member_id, filing_status, dependents_count, use_default_withholding, federal_pct_override, extra_withholding, state_pct_override, social_security_exempt, medicare_exempt, other_deductions, notes"
        )
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}
