/**
 * Crew minimum/recommended counts by truck unit type.
 *
 * Engines need at least 3 crew (4 is the suggested max). Hand-washing trailers
 * and water tenders can run with 1+. Anything else falls back to 1 (no warning).
 *
 * Pure helper — no React, no DB. Easy to unit-test.
 */

export interface CrewMinimumRule {
  /** Minimum recommended crew for this unit type. */
  min: number;
  /** Suggested max crew (informational only), or null if there's no cap. */
  suggestedMax: number | null;
  /** Friendly label used in warning copy. */
  label: string;
}

const ENGINE_MATCHERS = [
  /\bengine\b/i,
  /\btype\s*[3456]\b/i, // Type 3 / Type 4 / Type 5 / Type 6
];

const TENDER_MATCHERS = [/\btender\b/i, /\bwater\s*tender\b/i];
const HANDWASH_MATCHERS = [/\bhand[-\s]?wash/i, /\bwash(ing)?\s*trailer\b/i];

/**
 * Resolve the minimum-crew rule for a given truck unit_type string.
 * Falls back to a permissive {min:1} for unknown types so we don't nag users
 * for trucks we haven't classified yet.
 */
export function getCrewMinimum(unitType: string | null | undefined): CrewMinimumRule {
  const s = (unitType ?? "").trim();
  if (!s) return { min: 1, suggestedMax: null, label: "Unit" };

  if (ENGINE_MATCHERS.some((rx) => rx.test(s))) {
    return { min: 3, suggestedMax: 4, label: "Engines" };
  }
  if (TENDER_MATCHERS.some((rx) => rx.test(s))) {
    return { min: 1, suggestedMax: null, label: "Water Tenders" };
  }
  if (HANDWASH_MATCHERS.some((rx) => rx.test(s))) {
    return { min: 1, suggestedMax: null, label: "Hand Washing Trailers" };
  }
  return { min: 1, suggestedMax: null, label: s };
}

/**
 * Count distinct crew members on a personnel_entries array.
 * Names are normalized (trim + lowercase) so accidental case differences
 * across daily rows don't double-count.
 */
export function countDistinctCrew(
  entries: Array<{ operator_name?: string | null }> | null | undefined
): number {
  if (!Array.isArray(entries)) return 0;
  const set = new Set<string>();
  entries.forEach((e) => {
    const n = (e?.operator_name ?? "").trim().toLowerCase();
    if (n) set.add(n);
  });
  return set.size;
}

export interface CrewCountEvaluation {
  rule: CrewMinimumRule;
  count: number;
  isUnderMin: boolean;
  isOverSuggested: boolean;
}

export function evaluateCrewCount(
  entries: Array<{ operator_name?: string | null }> | null | undefined,
  unitType: string | null | undefined
): CrewCountEvaluation {
  const rule = getCrewMinimum(unitType);
  const count = countDistinctCrew(entries);
  return {
    rule,
    count,
    isUnderMin: count > 0 && count < rule.min, // empty ticket isn't a "thin crew" — that's a different state
    isOverSuggested:
      rule.suggestedMax !== null && count > rule.suggestedMax,
  };
}
