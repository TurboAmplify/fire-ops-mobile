/**
 * Operation type → UI labels.
 * Engines are stored in the existing `trucks` table; this helper just decides
 * what to call them in the UI based on what the org does.
 */

export type OperationType = "engine" | "hand_crew" | "both";

export function isValidOperationType(v: unknown): v is OperationType {
  return v === "engine" || v === "hand_crew" || v === "both";
}

/** Singular UI label for a truck-as-resource. */
export function getEngineLabel(opType: OperationType | null | undefined): string {
  // "Engine" is the wildland fire term that contractors use.
  // We keep "Truck" only when the org is purely hand-crew based — there
  // they won't see this much anyway.
  if (opType === "hand_crew") return "Truck";
  return "Engine";
}

export function showsEngines(opType: OperationType | null | undefined): boolean {
  return opType !== "hand_crew";
}

export function showsHandCrews(opType: OperationType | null | undefined): boolean {
  return opType === "hand_crew" || opType === "both";
}
