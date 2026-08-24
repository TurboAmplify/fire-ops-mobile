import type { EvalRatings, RatingColumnKey } from "@/lib/eval-225";

/**
 * The editable payload of an ICS-225 eval. Shared by the in-app form and the
 * public (texted-link) form so both write identical data.
 */
export interface EvalFormValue {
  subject_name: string;
  subject_home_unit: string;
  fire_name: string;
  fire_number: string;
  fire_location: string;
  fire_position: string;
  assignment_from: string;
  assignment_to: string;
  acres_burned: string;
  fuel_types: string;
  work_category: RatingColumnKey;
  work_category_other: string;
  ratings: EvalRatings;
  other_factor_label: string;
  remarks: string;
  rater_name: string;
  rater_home_unit: string;
  rater_position: string;
}

export const EMPTY_EVAL_VALUE: EvalFormValue = {
  subject_name: "",
  subject_home_unit: "",
  fire_name: "",
  fire_number: "",
  fire_location: "",
  fire_position: "",
  assignment_from: "",
  assignment_to: "",
  acres_burned: "",
  fuel_types: "",
  work_category: "hot_line",
  work_category_other: "",
  ratings: {},
  other_factor_label: "",
  remarks: "",
  rater_name: "",
  rater_home_unit: "",
  rater_position: "",
};

/** Build a form value from a DB row (or partial). */
export function toFormValue(row: Record<string, unknown> | null | undefined): EvalFormValue {
  const s = (k: string) => (typeof row?.[k] === "string" ? (row[k] as string) : "");
  return {
    ...EMPTY_EVAL_VALUE,
    subject_name: s("subject_name"),
    subject_home_unit: s("subject_home_unit"),
    fire_name: s("fire_name"),
    fire_number: s("fire_number"),
    fire_location: s("fire_location"),
    fire_position: s("fire_position"),
    assignment_from: s("assignment_from"),
    assignment_to: s("assignment_to"),
    acres_burned: s("acres_burned"),
    fuel_types: s("fuel_types"),
    work_category: (s("work_category") || "hot_line") as EvalFormValue["work_category"],
    work_category_other: s("work_category_other"),
    ratings: (row?.ratings as EvalRatings) ?? {},
    other_factor_label: s("other_factor_label"),
    remarks: s("remarks"),
    rater_name: s("rater_name"),
    rater_home_unit: s("rater_home_unit"),
    rater_position: s("rater_position"),
  };
}

/** Convert a form value to a DB patch (empty strings become null). */
export function toPatch(v: EvalFormValue): Record<string, unknown> {
  const n = (x: string) => (x.trim() === "" ? null : x.trim());
  return {
    subject_name: n(v.subject_name),
    subject_home_unit: n(v.subject_home_unit),
    fire_name: n(v.fire_name),
    fire_number: n(v.fire_number),
    fire_location: n(v.fire_location),
    fire_position: n(v.fire_position),
    assignment_from: n(v.assignment_from),
    assignment_to: n(v.assignment_to),
    acres_burned: n(v.acres_burned),
    fuel_types: n(v.fuel_types),
    work_category: v.work_category,
    work_category_other: n(v.work_category_other),
    ratings: v.ratings,
    other_factor_label: n(v.other_factor_label),
    remarks: n(v.remarks),
    rater_name: n(v.rater_name),
    rater_home_unit: n(v.rater_home_unit),
    rater_position: n(v.rater_position),
  };
}
