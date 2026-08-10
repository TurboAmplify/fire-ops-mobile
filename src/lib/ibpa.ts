export const IBPA_COMPANY = {
  vendor: "Dry Lightning Wildland Firefighters LLC",
  instructor: "Dustin Aldrich",
  phone: "605-891-8916",
  mou: "Not subject to the Region 1 or Region 6 MOU-holder process",
};

export const IBPA_EXCLUDED = ["Brandon Aldrich", "Justin Richardson"];

export const QUAL_OPTIONS = [
  { value: "FFT2", label: "Firefighter Type 2 — FFT2" },
  { value: "FFT1", label: "Firefighter Type 1 — FFT1" },
  { value: "ENGB", label: "Engine Boss — ENGB" },
  { value: "Faller", label: "Faller" },
  { value: "Medical", label: "Medical — REMS, EMR or Ambulance" },
  { value: "Water Handling", label: "Water Handling" },
  { value: "None of these", label: "None of these" },
  { value: "I'm not sure", label: "I'm not sure" },
];

export const AGREEMENT_OPTIONS = [
  { value: "Water Handling", label: "Water Handling" },
  { value: "Faller", label: "Faller" },
  { value: "Medical", label: "Medical — REMS, EMR or Ambulance" },
  { value: "None of these", label: "None of these" },
  { value: "I'm not sure", label: "I'm not sure" },
];

export const PROVIDER_OPTIONS = ["FEMA", "NWCG", "Another provider", "I don't know"];

export const COURSE_LABELS: Record<string, string> = {
  rt130: "RT-130 Annual Refresher",
  wct: "Arduous Work Capacity Test",
  s130: "S-130",
  s190: "S-190",
  ics100: "ICS-100",
  is700a: "IS-700a",
  l180: "L-180",
  s131_133: "S-131 / S-133",
  fft1_taskbook: "FFT1 Taskbook Certification",
  ics200: "ICS-200",
  s230: "S-230",
  s290: "S-290",
  engb_taskbook: "ENGB Taskbook Certification",
};

export const ALL_COURSE_KEYS = Object.keys(COURSE_LABELS);

export interface CourseAnswer {
  date: string | null;
  unknown: boolean;
  online?: string | null;
  provider?: string | null;
  provider_other?: string;
}

export interface IbpaResponse {
  id: string;
  organization_id: string;
  crew_member_id: string;
  crew_member_name: string;
  recorded_role: string | null;
  recorded_qualifications: Record<string, unknown>;
  identity: Record<string, unknown>;
  role_confirmation: { answer?: string | null; corrected?: string[] };
  agreement_categories: string[];
  courses: Record<string, CourseAnswer | string | null>;
  unknown_fields: string[];
  needs_review: boolean;
  submitted_at: string;
}

/** Which question blocks apply, based on recorded role + any correction. */
export function deriveQuals(recordedRole: string | null, corrected: string[]) {
  const role = (recordedRole ?? "").toLowerCase();
  const has = (q: string) => corrected.includes(q);
  const engb = has("ENGB") || role.includes("engine boss");
  const fft1 = has("FFT1") || role.includes("ff 1") || role.includes("fft1");
  const fft2 = has("FFT2") || role.includes("ff 2") || role.includes("fft2") || fft1 || engb;
  return { fft2, fft1, engb };
}

export function formatPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
