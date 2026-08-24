import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EVAL_FACTORS,
  RATING_COLUMNS,
  RATING_SCORES,
  getScore,
  setScore,
  remarksRequired,
  selectedColumns,
  columnLabel,
  type RatingColumnKey,
} from "@/lib/eval-225";
import type { EvalFormValue } from "./types";

interface Props {
  value: EvalFormValue;
  onChange: (patch: Partial<EvalFormValue>) => void;
  disabled?: boolean;
}

/**
 * Easy-read ratings. The evaluator first picks every kind of work they want to
 * rate; each pick becomes its own section, walked through with a Next button.
 * Anything not picked stays unrated and shows as N/A on the traditional form.
 */
export function EvalRatingsEasy({ value, onChange, disabled }: Props) {
  const columns = selectedColumns(value.work_categories, value.work_category);
  const [step, setStep] = useState(0);
  const needRemarks = remarksRequired(value.ratings);

  // Keep the step in range when the selection changes.
  useEffect(() => {
    if (step > columns.length - 1) setStep(Math.max(0, columns.length - 1));
  }, [columns.length, step]);

  const toggleColumn = (key: RatingColumnKey) => {
    const next = columns.includes(key) ? columns.filter((c) => c !== key) : [...columns, key];
    if (next.length === 0) return; // always keep at least one
    const ordered = RATING_COLUMNS.map((c) => c.key as RatingColumnKey).filter((k) => next.includes(k));
    onChange({ work_categories: ordered, work_category: ordered[0] });
  };

  const column = columns[Math.min(step, columns.length - 1)] ?? "hot_line";
  const multi = columns.length > 1;
  const isLast = step >= columns.length - 1;

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-2xl bg-card p-4 card-shadow">
        <p className="text-sm font-bold">Step 1 — pick what you're rating</p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Tap every kind of work this person did. Pick more than one if it applies — you'll rate each one on its own
          screen. Anything you don't pick is left blank and marked N/A on the official form.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {RATING_COLUMNS.map((c) => {
            const active = columns.includes(c.key as RatingColumnKey);
            return (
              <button
                key={c.key}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggleColumn(c.key as RatingColumnKey)}
                className={`relative min-h-12 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {active && <Check className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />}
                {c.label}
                {!active && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase opacity-60">
                    N/A
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {columns.includes("other") && (
          <Input
            value={value.work_category_other}
            disabled={disabled}
            placeholder="Specify the work (e.g. Structure protection)"
            onChange={(e) => onChange({ work_category_other: e.target.value })}
            className="h-12 text-base"
          />
        )}
      </div>

      <div className="rounded-xl bg-secondary/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        {RATING_SCORES.map((s) => (
          <div key={s.value}>
            <span className="font-bold text-foreground">{s.short} — {s.label}.</span> {s.help}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">
            Step {multi ? step + 2 : 2} — rate {columnLabel(column, value.work_category_other)}
          </p>
          {multi && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
              {step + 1} of {columns.length}
            </span>
          )}
        </div>

        {EVAL_FACTORS.map((f) => {
          const score = getScore(value.ratings, f.key, column);
          return (
            <div key={f.key} className="rounded-2xl bg-card p-4 card-shadow">
              <p className="text-sm font-bold">{f.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{f.help}</p>
              {f.key === "other" && (
                <Input
                  value={value.other_factor_label}
                  disabled={disabled}
                  placeholder="Specify what you're rating"
                  onChange={(e) => onChange({ other_factor_label: e.target.value })}
                  className="mt-2 h-11 text-base"
                />
              )}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {RATING_SCORES.map((s) => {
                  const active = score === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={disabled}
                      aria-label={`${f.label}: ${s.label}`}
                      onClick={() =>
                        onChange({
                          ratings: setScore(value.ratings, f.key, column, active ? null : s.value),
                        })
                      }
                      className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      <span className="text-base font-bold">{s.short}</span>
                      <span className="text-[9px] leading-tight opacity-80">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {multi && (
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(columns.length - 1, s + 1))}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground"
              >
                Next: {columnLabel(columns[step + 1], value.work_category_other)}
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isLast && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            10. Remarks {needRemarks && <span className="text-destructive">(required — a 0 or 1 was given)</span>}
          </Label>
          <Textarea
            value={value.remarks}
            disabled={disabled}
            placeholder="What went well, what needs to improve, any deficiencies."
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={5}
            className="text-base"
          />
        </div>
      )}
    </div>
  );
}
