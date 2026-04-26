/**
 * Billing types — shared across the billing strategy modules.
 *
 * Architecture note: contractor / vfd / agency logic lives in *separate*
 * files and is dispatched by `resolve.ts`. Do NOT mix VFD logic into
 * contractor logic or vice-versa. Keeping them isolated lets us evolve
 * VFD pricing later without risking the contractor revenue path.
 */

export type BillingStatus = "trial" | "active" | "read_only" | "locked";

export type OrgType = "contractor" | "vfd" | "state_agency";

export type PlanCode =
  | "contractor_trial"
  | "contractor_active"
  | "vfd_preview"
  | "vfd_partner"
  | "agency_standard"
  | string;

export interface OrgBillingInput {
  orgType: OrgType;
  billingStatus: BillingStatus;
  planCode: PlanCode;
  trialEndsAt: string | null;
}

export interface PlanResolution {
  /** Stable plan identifier used in code/UI logic. */
  planCode: PlanCode;
  /** Human-readable plan name shown to admins. */
  planLabel: string;
  /** Current lifecycle status. */
  status: BillingStatus;
  /** When the trial/preview ends (ISO), if applicable. */
  trialEndsAt: string | null;
  /** Days remaining in trial (negative = past due). null if no trial. */
  daysRemaining: number | null;
  /** True when the org should be in soft read-only mode. */
  isReadOnly: boolean;
  /** True when the org is fully locked out. */
  isLocked: boolean;
  /**
   * UI banner config. null means no banner needed.
   * Variant maps to design tokens (info / warn / destructive).
   */
  banner: {
    variant: "info" | "warning" | "destructive";
    title: string;
    message: string;
    cta?: { label: string; href: string };
  } | null;
}
