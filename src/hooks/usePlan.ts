import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { resolvePlan, type PlanResolution } from "@/lib/billing/resolve";
import type { OrgType, BillingStatus } from "@/lib/billing/types";

interface BillingRow {
  org_type: OrgType;
  billing_status: BillingStatus;
  plan_code: string;
  trial_ends_at: string | null;
}

/**
 * Returns the resolved plan for the active org. Soft-enforcement only —
 * components opt-in by checking `plan.isReadOnly` before allowing writes.
 */
export function usePlan() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  const [plan, setPlan] = useState<PlanResolution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!orgId) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("org_type, billing_status, plan_code, trial_ends_at")
        .eq("id", orgId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setPlan(null);
        setLoading(false);
        return;
      }
      const row = data as unknown as BillingRow;
      setPlan(
        resolvePlan({
          orgType: row.org_type ?? "contractor",
          billingStatus: row.billing_status ?? "active",
          planCode: row.plan_code ?? "contractor_active",
          trialEndsAt: row.trial_ends_at,
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return { plan, loading };
}
