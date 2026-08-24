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
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <EvalViewToggle view={view} onChange={onViewChange} />

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
        <EvalTraditional value={value} onChange={onChange} disabled={disabled} />
      )}

      {children}
    </div>
  );
}
