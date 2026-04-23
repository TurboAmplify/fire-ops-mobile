// Standard wildland crew roles. Add to this list to expand the dropdown.
// "Other" lets admins type a custom role.
export const CREW_ROLES = [
  "Engine Boss",
  "Crew Boss",
  "Engineer",
  "FF 1",
  "FF 2",
  "Other",
] as const;

export type StandardCrewRole = (typeof CREW_ROLES)[number];
