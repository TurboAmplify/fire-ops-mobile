/**
 * ICS-225 / OF-225 "Incident Personnel Performance Rating" domain model.
 *
 * Shared by the in-app eval form, the public (texted-link) form, and the PDF
 * generator so all three stay in lockstep.
 */

export type EvalDirection = "internal" | "outward" | "inbound_request";
export type EvalStatus = "draft" | "awaiting_rater" | "awaiting_employee" | "complete";

export const RATING_COLUMNS = [
  { key: "hot_line", label: "Hot Line" },
  { key: "mop_up", label: "Mop-Up" },
  { key: "camp", label: "Camp" },
  { key: "other", label: "Other" },
] as const;

export type RatingColumnKey = (typeof RATING_COLUMNS)[number]["key"];

export interface EvalFactor {
  key: string;
  /** Exact wording from the federal form. */
  label: string;
  /** Plain-English prompt shown in easy-read mode. */
  help: string;
}

export const EVAL_FACTORS: EvalFactor[] = [
  { key: "knowledge", label: "Knowledge of the job", help: "Do they know the work, the tools, and the tactics?" },
  { key: "performance", label: "Ability to obtain performance", help: "Can they get the job done and get results from others?" },
  { key: "attitude", label: "Attitude", help: "Attitude toward the assignment, the crew, and the agency." },
  { key: "decisions", label: "Decisions under stress", help: "Quality of their calls when things get busy or go sideways." },
  { key: "initiative", label: "Initiative", help: "Do they see work and take it on without being told?" },
  { key: "welfare", label: "Consideration for personnel welfare", help: "Do they look after their people — rest, food, water, morale?" },
  { key: "equipment", label: "Obtain necessary equipment and supplies", help: "Do they get their crew the gear and supplies they need?" },
  { key: "physical", label: "Physical ability for the job", help: "Fitness and stamina for the assignment they filled." },
  { key: "safety", label: "Safety", help: "Do they work safe and hold others to it?" },
  { key: "other", label: "Other (specify)", help: "Anything else worth rating — name it below." },
];

export interface RatingScoreOption {
  value: number;
  short: string;
  label: string;
  help: string;
  /** Remarks are required by the form for 0 and 1. */
  requiresRemarks: boolean;
}

export const RATING_SCORES: RatingScoreOption[] = [
  {
    value: 0,
    short: "0",
    label: "Deficient",
    help: "Does not meet minimum requirements. Must be explained in remarks.",
    requiresRemarks: true,
  },
  {
    value: 1,
    short: "1",
    label: "Needs to improve",
    help: "Meets some or most requirements. Identify the improvement needed in remarks.",
    requiresRemarks: true,
  },
  { value: 2, short: "2", label: "Satisfactory", help: "Meets all requirements of this element.", requiresRemarks: false },
  { value: 3, short: "3", label: "Superior", help: "Consistently exceeds the performance requirements.", requiresRemarks: false },
];

/** ratings JSONB shape: { [factorKey]: { [columnKey]: 0|1|2|3 } } */
export type EvalRatings = Record<string, Partial<Record<RatingColumnKey, number>>>;

export function getScore(
  ratings: EvalRatings | null | undefined,
  factor: string,
  column: RatingColumnKey,
): number | null {
  const v = ratings?.[factor]?.[column];
  return typeof v === "number" ? v : null;
}

export function setScore(
  ratings: EvalRatings | null | undefined,
  factor: string,
  column: RatingColumnKey,
  score: number | null,
): EvalRatings {
  const next: EvalRatings = { ...(ratings ?? {}) };
  const row = { ...(next[factor] ?? {}) };
  if (score === null) delete row[column];
  else row[column] = score;
  if (Object.keys(row).length === 0) delete next[factor];
  else next[factor] = row;
  return next;
}

export function ratedFactorCount(ratings: EvalRatings | null | undefined): number {
  if (!ratings) return 0;
  return Object.values(ratings).filter((row) => Object.keys(row ?? {}).length > 0).length;
}

/** Any 0 or 1 anywhere means the form requires written remarks. */
export function remarksRequired(ratings: EvalRatings | null | undefined): boolean {
  if (!ratings) return false;
  return Object.values(ratings).some((row) =>
    Object.values(row ?? {}).some((v) => v === 0 || v === 1),
  );
}

export const STATUS_LABELS: Record<EvalStatus, string> = {
  draft: "Draft",
  awaiting_rater: "Awaiting rater",
  awaiting_employee: "Awaiting signature",
  complete: "Complete",
};

export const STATUS_CLASSES: Record<EvalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_rater: "bg-amber-500/15 text-amber-600",
  awaiting_employee: "bg-primary/15 text-primary",
  complete: "bg-success/15 text-success",
};

export const DIRECTION_LABELS: Record<EvalDirection, string> = {
  internal: "Our crew — rated by us",
  outward: "Outside person — rated by us",
  inbound_request: "Our crew — rated by outside supervisor",
};

export function columnLabel(key: string | null | undefined, otherLabel?: string | null): string {
  if (key === "other") return otherLabel?.trim() || "Other";
  return RATING_COLUMNS.find((c) => c.key === key)?.label ?? "Hot Line";
}

/**
 * The work categories the evaluator chose to rate. Falls back to the legacy
 * single `work_category` so older evals keep working.
 */
export function selectedColumns(
  categories: string[] | null | undefined,
  fallback?: string | null,
): RatingColumnKey[] {
  const valid = RATING_COLUMNS.map((c) => c.key as RatingColumnKey);
  const picked = (categories ?? []).filter((c): c is RatingColumnKey => valid.includes(c as RatingColumnKey));
  if (picked.length > 0) return valid.filter((k) => picked.includes(k));
  const fb = valid.find((k) => k === fallback);
  return [fb ?? "hot_line"];
}


/** URL-safe random token for public eval links. */
export function newEvalToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function evalShareUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/eval/${token}`;
}
