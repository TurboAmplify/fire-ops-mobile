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

  if (isLocked) {
    banner = {
      variant: "destructive",
      title: "Account locked",
      message: "Your account is locked. Contact support to restore access.",
      cta: { label: "Contact support", href: "/support" },
    };
  } else if (isReadOnly) {
    banner = {
      variant: "destructive",
      title: "Trial ended — read-only mode",
      message:
        "Your contractor trial has ended. Upgrade to keep creating incidents, shifts, and expenses.",
      cta: { label: "Contact support", href: "/support" },
    };
  } else if (input.billingStatus === "trial") {
    if (days !== null && days <= 7) {
      banner = {
        variant: days <= 3 ? "warning" : "info",
        title: days <= 0 ? "Trial expired" : `Trial ends in ${days} day${days === 1 ? "" : "s"}`,
        message:
          days <= 0
            ? "Your trial has expired. Reach out to keep your account active."
            : "Reach out to set up billing before your trial ends.",
        cta: { label: "Contact support", href: "/support" },
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
