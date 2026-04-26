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

  if (isLocked) {
    banner = {
      variant: "destructive",
      title: "VFD account locked",
      message: "This VFD account is locked. Contact us to discuss access.",
      cta: { label: "Contact us", href: "/support" },
    };
  } else if (isReadOnly) {
    banner = {
      variant: "warning",
      title: "VFD preview ended",
      message:
        "Your VFD preview is read-only. Contact us to discuss continued access — we handle VFD pricing case-by-case.",
      cta: { label: "Contact us", href: "/support" },
    };
  } else if (input.billingStatus === "trial" && days !== null && days <= 10) {
    banner = {
      variant: days <= 3 ? "warning" : "info",
      title: `VFD preview ends in ${days} day${days === 1 ? "" : "s"}`,
      message:
        "After preview ends, your account moves to read-only until we set up access. Reach out anytime.",
      cta: { label: "Contact us", href: "/support" },
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
