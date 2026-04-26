/**
 * Billing strategy dispatcher.
 *
 * Given an org's billing input, route to the appropriate plan module.
 * This is the ONLY place that knows about all three strategies — keeps
 * each plan file self-contained.
 */
import type { OrgBillingInput, PlanResolution } from "./types";
import { resolveContractorPlan } from "./contractor-plans";
import { resolveVfdPlan } from "./vfd-plans";
import { resolveAgencyPlan } from "./agency-plans";

export function resolvePlan(input: OrgBillingInput): PlanResolution {
  switch (input.orgType) {
    case "vfd":
      return resolveVfdPlan(input);
    case "state_agency":
      return resolveAgencyPlan(input);
    case "contractor":
    default:
      return resolveContractorPlan(input);
  }
}

export type { OrgBillingInput, PlanResolution } from "./types";
