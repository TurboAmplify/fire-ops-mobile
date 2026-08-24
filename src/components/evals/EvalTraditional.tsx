import {
  EVAL_FACTORS,
  RATING_COLUMNS,
  RATING_SCORES,
  getScore,
  setScore,
  type RatingColumnKey,
} from "@/lib/eval-225";
import type { EvalFormValue } from "./types";

interface Props {
  value: EvalFormValue;
  onChange: (patch: Partial<EvalFormValue>) => void;
  disabled?: boolean;
}

function Block({
  n,
  label,
  children,
  className = "",
}: {
  n: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-foreground/40 px-2 py-1 ${className}`}>
      <p className="text-[9px] font-semibold uppercase leading-tight text-foreground/70">
        {n}. {label}
      </p>
      <div className="min-h-6 text-[12px] font-medium">{children}</div>
    </div>
  );
}

function Val({ v }: { v: string }) {
  return <span>{v?.trim() ? v : "\u00A0"}</span>;
}

/**
 * Faithful ICS-225 layout. Read-only for header/remarks (edit those in easy
 * read) but the rating grid is tappable so the traditional view is usable on
 * its own.
 */
export function EvalTraditional({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-foreground/40 bg-card p-3">
        <p className="text-center text-[13px] font-bold uppercase tracking-wide">
          Incident Personnel Performance Rating
        </p>
        <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
          INSTRUCTIONS: The immediate job supervisor will prepare this form for each subordinate. It will be delivered
          to the planning section before the rater leaves the fire. Rating will be reviewed with the employee who will
          sign at the bottom. THIS RATING TO BE USED ONLY FOR DETERMINING AN INDIVIDUAL'S PERFORMANCE.
        </p>

        <div className="mt-2 grid grid-cols-2">
          <Block n="1" label="Name"><Val v={value.subject_name} /></Block>
          <Block n="2" label="Fire name and number">
            <Val v={[value.fire_name, value.fire_number].filter(Boolean).join(" — ")} />
          </Block>
          <Block n="3" label="Home unit (address)"><Val v={value.subject_home_unit} /></Block>
          <Block n="4" label="Location of fire"><Val v={value.fire_location} /></Block>
          <Block n="5" label="Fire position"><Val v={value.fire_position} /></Block>
          <Block n="6" label="Date of assignment">
            <Val v={[value.assignment_from, value.assignment_to].filter(Boolean).join(" to ")} />
          </Block>
          <Block n="7" label="Acres burned"><Val v={value.acres_burned} /></Block>
          <Block n="8" label="Fuel type(s)"><Val v={value.fuel_types} /></Block>
        </div>

        <div className="mt-3 border border-foreground/40 p-2">
          <p className="text-[10px] font-bold">9. Evaluation</p>
          <p className="text-[9px] leading-snug text-muted-foreground">
            Enter X under appropriate rating number and under proper heading for each category listed.
            {RATING_SCORES.map((s) => ` ${s.short} - ${s.label}.`).join("")}
          </p>
        </div>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-foreground/40 px-1 py-1 text-left align-bottom">Rating Factors</th>
                {RATING_COLUMNS.map((c) => (
                  <th key={c.key} colSpan={4} className="border border-foreground/40 px-1 py-1 text-center">
                    {c.key === "other" ? value.work_category_other?.trim() || "Other (specify)" : c.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="border border-foreground/40" />
                {RATING_COLUMNS.map((c) =>
                  RATING_SCORES.map((s) => (
                    <th key={`${c.key}-${s.value}`} className="w-6 border border-foreground/40 py-0.5 text-center font-semibold">
                      {s.short}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {EVAL_FACTORS.map((f) => (
                <tr key={f.key}>
                  <td className="border border-foreground/40 px-1 py-1 align-middle">
                    {f.key === "other" && value.other_factor_label?.trim()
                      ? `Other — ${value.other_factor_label}`
                      : f.label}
                  </td>
                  {RATING_COLUMNS.map((c) =>
                    RATING_SCORES.map((s) => {
                      const active = getScore(value.ratings, f.key, c.key as RatingColumnKey) === s.value;
                      return (
                        <td key={`${f.key}-${c.key}-${s.value}`} className="border border-foreground/40 p-0 text-center">
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`${f.label} — ${c.label} — ${s.label}`}
                            onClick={() =>
                              onChange({
                                ratings: setScore(
                                  value.ratings,
                                  f.key,
                                  c.key as RatingColumnKey,
                                  active ? null : s.value,
                                ),
                                work_category: c.key as RatingColumnKey,
                              })
                            }
                            className="flex h-9 w-full items-center justify-center text-[12px] font-bold text-primary active:bg-secondary"
                          >
                            {active ? "X" : "\u00A0"}
                          </button>
                        </td>
                      );
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 border border-foreground/40 px-2 py-1">
          <p className="text-[9px] font-semibold uppercase text-foreground/70">10. Remarks</p>
          <p className="min-h-16 whitespace-pre-wrap text-[11px]">{value.remarks || "\u00A0"}</p>
        </div>

        <div className="mt-2 grid grid-cols-2">
          <Block n="11" label="Employee (signature) — this rating has been discussed with me">
            {"\u00A0"}
          </Block>
          <Block n="12" label="Date">{"\u00A0"}</Block>
          <Block n="13" label="Rated by (signature)"><Val v={value.rater_name} /></Block>
          <Block n="14" label="Home unit (address)"><Val v={value.rater_home_unit} /></Block>
          <Block n="15" label="Position on fire"><Val v={value.rater_position} /></Block>
          <Block n="16" label="Date">{"\u00A0"}</Block>
        </div>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        Signatures are captured at the bottom of the page.
      </p>
    </div>
  );
}
