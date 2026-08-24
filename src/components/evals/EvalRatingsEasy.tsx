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
  type RatingColumnKey,
} from "@/lib/eval-225";
import type { EvalFormValue } from "./types";

interface Props {
  value: EvalFormValue;
  onChange: (patch: Partial<EvalFormValue>) => void;
  disabled?: boolean;
}

/**
 * Easy-read ratings: pick the work type once at the top, then one factor per
 * card with big 0-3 buttons. Same data as the traditional grid.
 */
export function EvalRatingsEasy({ value, onChange, disabled }: Props) {
  const column = value.work_category as RatingColumnKey;
  const needRemarks = remarksRequired(value.ratings);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What kind of work are you rating?
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {RATING_COLUMNS.map((c) => {
            const active = column === c.key;
            return (
              <button
                key={c.key}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ work_category: c.key })}
                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {column === "other" && (
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
      </div>

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
    </div>
  );
}
