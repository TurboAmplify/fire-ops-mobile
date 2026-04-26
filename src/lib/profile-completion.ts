/**
 * Computed profile-completion helpers.
 *
 * Onboarding lets users create resources with minimal data (just a name).
 * These helpers identify what's still missing so the Dashboard's "Finish setup"
 * card can nudge users toward filling in the rest. Computed, not stored —
 * always reflects current data with no sync logic to maintain.
 */

import type { Tables } from "@/integrations/supabase/types";

type Truck = Tables<"trucks">;
type CrewMember = Tables<"crew_members">;
type Crew = Tables<"crews">;

/** A truck is "complete" when it has the core identifying + compliance fields. */
export function isTruckComplete(t: Truck): boolean {
  const a = t as any;
  return Boolean(
    a.vin?.trim() &&
      a.make?.trim() &&
      a.model?.trim() &&
      a.plate?.trim() &&
      a.insurance_expiry,
  );
}

export function truckMissingFields(t: Truck): string[] {
  const a = t as any;
  const missing: string[] = [];
  if (!a.vin?.trim()) missing.push("VIN");
  if (!a.make?.trim()) missing.push("Make");
  if (!a.model?.trim()) missing.push("Model");
  if (!a.plate?.trim()) missing.push("Plate");
  if (!a.insurance_expiry) missing.push("Insurance expiry");
  return missing;
}

/** A crew member is "complete" when they have a real role and contact info. */
export function isCrewMemberComplete(m: CrewMember): boolean {
  const role = (m.role ?? "").trim().toLowerCase();
  // 'crew' is the placeholder we set during quick onboarding — treat as incomplete.
  const hasRealRole = role.length > 0 && role !== "crew";
  const hasPhone = Boolean(m.phone?.trim());
  return hasRealRole && hasPhone;
}

export function crewMemberMissingFields(m: CrewMember): string[] {
  const missing: string[] = [];
  const role = (m.role ?? "").trim().toLowerCase();
  if (role.length === 0 || role === "crew") missing.push("Role");
  if (!m.phone?.trim()) missing.push("Phone");
  return missing;
}

/** A hand crew is "complete" when it has at least one member assigned. */
export function isCrewComplete(crew: Crew, allMembers: Pick<CrewMember, "id">[] & { crew_id?: string | null }[]): boolean {
  return allMembers.some((m: any) => m.crew_id === crew.id);
}

export function countCrewMembers(crewId: string, allMembers: any[]): number {
  return allMembers.filter((m) => m.crew_id === crewId).length;
}
