/**
 * State agency billing — placeholder.
 *
 * Agencies are typically onboarded manually via contract. They default to
 * "active" with no trial and no soft enforcement. We'll formalize agency
 * pricing later; for now they always get full access.
 */
import type { OrgBillingInput, PlanResolution } from "./types";

export function resolveAgencyPlan(input: OrgBillingInput): PlanResolution {
  const isLocked = input.billingStatus === "locked";
  return {
    planCode: input.planCode,
    planLabel: "State Agency",
    status: input.billingStatus,
    trialEndsAt: null,
    daysRemaining: null,
    isReadOnly: input.billingStatus === "read_only",
    isLocked,
    banner: isLocked
      ? {
          variant: "destructive",
          title: "Account locked",
          message: "Contact support to restore access.",
          cta: { label: "Contact support", href: "/support" },
        }
      : null,
  };
}
