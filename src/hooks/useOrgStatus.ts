import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

/**
 * Fetches the active organization's effective subscription status.
 *
 * - `active`: app works normally
 * - `suspended` / `closed`: the user is redirected to /account-unavailable
 * - `app_review_protected` (or plan_code === 'app_review'): always treated as active
 *
 * Status changes are driven exclusively by the marketing site's edge-function
 * calls (Stripe webhook → suspend-org / reactivate-org / close-org). The app
 * never touches billing.
 */
export function useOrgStatus() {
  const { membership, loading: orgLoading } = useOrganization();
  const orgId = membership?.organizationId;

  const { data, isLoading } = useQuery({
    queryKey: ["org-status", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("status, plan_code")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const planCode = data?.plan_code ?? null;
  const rawStatus = data?.status ?? "active";
  const effectiveStatus = planCode === "app_review" ? "active" : rawStatus;
  const isAccessible = effectiveStatus === "active";

  return {
    loading: orgLoading || isLoading,
    status: effectiveStatus as "active" | "suspended" | "closed" | "app_review_protected",
    isAccessible,
    planCode,
  };
}
