/**
 * VFD (Volunteer Fire Department) billing logic — PARKED.
 *
 * Strategy:
 *  - VFDs are NOT a discounted contractor plan. They are a separate path.
 *  - Default: 30-day "preview" trial, then soft read-only with a prompt
 *    to contact us. We do not auto-charge or auto-promote.
 *  - "vfd_partner" status = manually approved by platform admin (no expiry).
 *
 * Do not import contractor-plans / agency-plans here. Keep VFD logic
 * fully isolated so we can iterate later without risking other plans.
 */
import type { OrgBillingInput, PlanResolution } from "./types";
import { daysUntil } from "./utils";

const PLAN_LABELS: Record<string, string> = {
  vfd_preview: "VFD (Limited Preview)",
  vfd_partner: "VFD Partner",
};

export function resolveVfdPlan(input: OrgBillingInput): PlanResolution {
  const label = PLAN_LABELS[input.planCode] ?? "Volunteer Fire Department";
  const days = daysUntil(input.trialEndsAt);

  const isLocked = input.billingStatus === "locked";
  // Treat expired preview as read_only even if status hasn't been flipped yet.
  const previewExpired =
    input.planCode === "vfd_preview" &&
    input.billingStatus === "trial" &&
    days !== null &&
    days <= 0;
  const isReadOnly = input.billingStatus === "read_only" || previewExpired;

  let banner: PlanResolution["banner"] = null;

  // NOTE (App Store / Apple Guideline 3.1.1): no pricing or sales language
  // in-app. Direct users to their administrator instead.
  if (isLocked) {
    banner = {
      variant: "destructive",
      title: "Account inactive",
      message: "This account is inactive. Please contact your administrator.",
      cta: { label: "Get help", href: "/support" },
    };
  } else if (isReadOnly) {
    banner = {
      variant: "warning",
      title: "Read-only mode",
      message:
        "This account is in read-only mode. Please contact your administrator to restore full access.",
      cta: { label: "Get help", href: "/support" },
    };
  } else if (input.billingStatus === "trial" && days !== null && days <= 10) {
    banner = {
      variant: days <= 3 ? "warning" : "info",
      title: `${days} day${days === 1 ? "" : "s"} remaining`,
      message:
        "After this period, the account moves to read-only. Please contact your administrator with any questions.",
      cta: { label: "Get help", href: "/support" },
    };
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
