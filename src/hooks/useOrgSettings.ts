import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface OrgSettings {
  inspection_alert_enabled: boolean;
  walkaround_enabled: boolean;
}

/**
 * Org-level feature flags. Cached short to feel snappy across screens.
 */
export function useOrgSettings() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;

  return useQuery({
    queryKey: ["org-settings", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<OrgSettings> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("inspection_alert_enabled, walkaround_enabled")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return {
        inspection_alert_enabled: (data as any)?.inspection_alert_enabled ?? true,
        walkaround_enabled: (data as any)?.walkaround_enabled ?? true,
      };
    },
  });
}
