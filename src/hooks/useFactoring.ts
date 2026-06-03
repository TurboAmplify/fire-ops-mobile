import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrgFactoringSettings,
  upsertOrgFactoringSettings,
  fetchFactoringSubmissions,
  type OrgFactoringSettings,
} from "@/services/factoring";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/** True when the active org has the factoring module enabled by super admin. */
export function useFactoringEnabled() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useQuery({
    queryKey: ["org-modules", orgId, "factoring"],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("modules_enabled")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return ((data?.modules_enabled as any)?.factoring === true) as boolean;
    },
  });
}

export function useOrgFactoringSettings() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useQuery({
    queryKey: ["org-factoring-settings", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOrgFactoringSettings(orgId!),
  });
}

export function useUpsertOrgFactoringSettings() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useMutation({
    mutationFn: (patch: Partial<OrgFactoringSettings>) => {
      if (!orgId) throw new Error("No organization");
      return upsertOrgFactoringSettings(orgId, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-factoring-settings", orgId] });
    },
  });
}

export function useFactoringSubmissions(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["factoring-submissions", incidentId],
    enabled: !!incidentId,
    queryFn: () => fetchFactoringSubmissions(incidentId!),
  });
}
