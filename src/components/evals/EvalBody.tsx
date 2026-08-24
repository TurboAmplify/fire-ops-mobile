import { EvalViewToggle, type EvalView } from "./EvalViewToggle";
import { EvalHeaderFields } from "./EvalHeaderFields";
import { EvalRatingsEasy } from "./EvalRatingsEasy";
import { EvalTraditional } from "./EvalTraditional";
import type { EvalFormValue } from "./types";

interface Props {
  view: EvalView;
  onViewChange: (v: EvalView) => void;
  value: EvalFormValue;
  onChange: (patch: Partial<EvalFormValue>) => void;
  lockSubject?: boolean;
  showRaterFields?: boolean;
  disabled?: boolean;
  /** Hide the easy/traditional toggle (public link shows the official form only). */
  lockView?: boolean;
  /** Rendered under the form (signatures, actions). */
  children?: React.ReactNode;
}

/**
 * The whole ICS-225 eval body with the easy-read / traditional toggle.
 * Shared by the in-app form and the public texted-link form.
 */
export function EvalBody({
  view,
  onViewChange,
  value,
  onChange,
  lockSubject,
  showRaterFields,
  disabled,
  lockView,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      {!lockView && <EvalViewToggle view={view} onChange={onViewChange} />}

      {view === "easy" ? (
        <>
          <EvalHeaderFields
            value={value}
            onChange={onChange}
            lockSubject={lockSubject}
            showRaterFields={showRaterFields}
            disabled={disabled}
          />
          <EvalRatingsEasy value={value} onChange={onChange} disabled={disabled} />
        </>
      ) : (
        <>
          {/* When the traditional form is the only view (public link) the rater
              still needs editable header + remarks fields. */}
          {lockView && !disabled && (
            <EvalHeaderFields
              value={value}
              onChange={onChange}
              lockSubject={lockSubject}
              showRaterFields={showRaterFields}
              disabled={disabled}
            />
          )}
          <EvalTraditional value={value} onChange={onChange} disabled={disabled} />
          {lockView && !disabled && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                10. Remarks {remarksRequired(value.ratings) && (
                  <span className="text-destructive">(required — a 0 or 1 was given)</span>
                )}
              </Label>
              <Textarea
                value={value.remarks}
                placeholder="What went well, what needs to improve, any deficiencies."
                onChange={(e) => onChange({ remarks: e.target.value })}
                rows={5}
                className="text-base"
              />
            </div>
          )}
        </>
      )}


      {children}
    </div>
  );
}
