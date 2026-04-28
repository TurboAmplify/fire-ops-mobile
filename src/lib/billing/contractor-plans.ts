/**
 * Contractor billing logic — the primary revenue path.
 *
 * IMPORTANT: Do not import vfd-plans or agency-plans from here. Each
 * strategy stays self-contained so changes to VFD handling cannot
 * accidentally alter contractor pricing behavior.
 */
import type { OrgBillingInput, PlanResolution } from "./types";
import { daysUntil } from "./utils";

const PLAN_LABELS: Record<string, string> = {
  contractor_trial: "Contractor (Trial)",
  contractor_active: "Contractor",
};

export function resolveContractorPlan(input: OrgBillingInput): PlanResolution {
  const label = PLAN_LABELS[input.planCode] ?? "Contractor";
  const days = daysUntil(input.trialEndsAt);

  const isLocked = input.billingStatus === "locked";
  const isReadOnly = input.billingStatus === "read_only";

  let banner: PlanResolution["banner"] = null;

  // NOTE (App Store / Apple Guideline 3.1.1): in-app messaging must not
  // function as a sales funnel. No "Upgrade", "Subscribe", pricing, or
  // external payment links. Direct affected users to their administrator.
  if (isLocked) {
    banner = {
      variant: "destructive",
      title: "Account inactive",
      message: "This account is inactive. Please contact your administrator.",
      cta: { label: "Get help", href: "/support" },
    };
  } else if (isReadOnly) {
    banner = {
      variant: "destructive",
      title: "Read-only mode",
      message:
        "This account is in read-only mode. Please contact your administrator to restore full access.",
      cta: { label: "Get help", href: "/support" },
    };
  } else if (input.billingStatus === "trial") {
    if (days !== null && days <= 7) {
      banner = {
        variant: days <= 3 ? "warning" : "info",
        title: days <= 0 ? "Account inactive" : `${days} day${days === 1 ? "" : "s"} remaining`,
        message:
          days <= 0
            ? "Please contact your administrator to keep this account active."
            : "Please contact your administrator before access becomes read-only.",
        cta: { label: "Get help", href: "/support" },
      };
    }
  }

  return {
    planCode: input.planCode,
    planLabel: label,
    status: input.billingStatus,
    trialEndsAt: input.trialEndsAt,
    daysRemaining: days,
    isReadOnly,
    isLocked,
    banner,
  };
}
