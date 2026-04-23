import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export type OrgType = "contractor" | "vfd" | "state_agency";

export interface ModuleFlags {
  resourceOrders: boolean;
  shiftTickets: boolean;
  payroll: boolean;
  runReport: boolean;
  ctr: boolean;
  training: boolean;
  callResponses: boolean;
  qualifications: boolean;
}

export interface ModeTerms {
  crew: string;
  fleet: string;
  shiftTicket: string;
  member: string; // singular
  truck: string;  // singular
}

interface ModeConfig {
  modules: ModuleFlags;
  terms: ModeTerms;
}

export const MODE_CONFIG: Record<OrgType, ModeConfig> = {
  contractor: {
    modules: {
      resourceOrders: true,
      shiftTickets: true,
      // Payroll v2: disabled by default for new contractor orgs.
      // Super admin opts each org in via organizations.modules_enabled.payroll.
      payroll: false,
      runReport: false,
      ctr: false,
      training: false,
      callResponses: false,
      qualifications: false,
    },
    terms: { crew: "Crew", fleet: "Fleet", shiftTicket: "Shift Ticket", member: "Crew Member", truck: "Truck" },
  },
  vfd: {
    modules: {
      resourceOrders: false,
      shiftTickets: false,
      payroll: false,
      runReport: false,
      ctr: false,
      training: true,
      callResponses: true,
      qualifications: true,
    },
    terms: { crew: "Members", fleet: "Apparatus", shiftTicket: "Run Report", member: "Member", truck: "Apparatus" },
  },
  state_agency: {
    modules: {
      resourceOrders: true,
      shiftTickets: false,
      payroll: false,
      runReport: false,
      ctr: false,
      training: true,
      callResponses: false,
      qualifications: true,
    },
    terms: { crew: "Personnel", fleet: "Apparatus", shiftTicket: "CTR", member: "Person", truck: "Apparatus" },
  },
};

export interface AppMode {
  orgType: OrgType;
  modules: ModuleFlags;
  terms: ModeTerms;
  acceptsAssignments: boolean;
  loading: boolean;
}

const DEFAULT_MODE: AppMode = {
  orgType: "contractor",
  modules: MODE_CONFIG.contractor.modules,
  terms: MODE_CONFIG.contractor.terms,
  acceptsAssignments: false,
  loading: true,
};

// Global payroll kill-switch (super admin controlled)
function usePayrollGlobalEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["platform-settings", "payroll_global_enabled"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "payroll_global_enabled")
        .maybeSingle();
      if (error) {
        // Non-admins can't read platform_settings — assume enabled (per-org gating still applies)
        return { enabled: true };
      }
      return (data?.value as any) ?? { enabled: true };
    },
  });
  return data?.enabled !== false;
}

export function useAppMode(): AppMode {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const payrollGlobalEnabled = usePayrollGlobalEnabled();

  const { data, isLoading } = useQuery({
    queryKey: ["org-mode", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("org_type, modules_enabled, accepts_assignments")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  return useMemo<AppMode>(() => {
    if (!orgId) return DEFAULT_MODE;
    const orgType = ((data?.org_type as OrgType) ?? "contractor") as OrgType;
    const base = MODE_CONFIG[orgType] ?? MODE_CONFIG.contractor;
    const acceptsAssignments = !!data?.accepts_assignments;
    const overrides = (data?.modules_enabled ?? {}) as Partial<ModuleFlags>;

    let modules = { ...base.modules };
    if (orgType === "vfd" && acceptsAssignments) {
      modules = { ...modules, resourceOrders: true, shiftTickets: true, payroll: true };
    }
    modules = { ...modules, ...overrides };

    // Global kill-switch: if disabled platform-wide, payroll is off for everyone.
    if (!payrollGlobalEnabled) {
      modules.payroll = false;
    }

    return {
      orgType,
      modules,
      terms: base.terms,
      acceptsAssignments,
      loading: isLoading,
    };
  }, [orgId, data, isLoading, payrollGlobalEnabled]);
}
