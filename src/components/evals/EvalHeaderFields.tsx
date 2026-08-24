import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EvalFormValue } from "./types";

interface Props {
  value: EvalFormValue;
  onChange: (patch: Partial<EvalFormValue>) => void;
  /** Subject name is locked when the eval is for a roster crew member. */
  lockSubject?: boolean;
  /** Hide rater identity fields (used when the app user is the rater). */
  showRaterFields?: boolean;
  disabled?: boolean;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function EvalHeaderFields({ value, onChange, lockSubject, showRaterFields, disabled }: Props) {
  const input = (key: keyof EvalFormValue, placeholder?: string, type = "text", locked = false) => (
    <Input
      type={type}
      value={String(value[key] ?? "")}
      placeholder={placeholder}
      disabled={disabled || locked}
      onChange={(e) => onChange({ [key]: e.target.value } as Partial<EvalFormValue>)}
      className="h-12 text-base"
    />
  );

  return (
    <div className="space-y-4">
      <Field label="1. Name of person being rated">{input("subject_name", "Full name", "text", lockSubject)}</Field>
      <Field label="2. Fire name and number">
        <div className="grid grid-cols-2 gap-2">
          {input("fire_name", "Fire name")}
          {input("fire_number", "Fire number")}
        </div>
      </Field>
      <Field label="3. Home unit (address)">{input("subject_home_unit", "Home unit / contractor address")}</Field>
      <Field label="4. Location of fire">{input("fire_location", "City / county / state")}</Field>
      <Field label="5. Fire position">{input("fire_position", "e.g. ENGB, FFT2, CRWB")}</Field>
      <Field label="6. Date of assignment">
        <div className="grid grid-cols-2 gap-2">
          {input("assignment_from", undefined, "date")}
          {input("assignment_to", undefined, "date")}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="7. Acres burned">{input("acres_burned", "Acres")}</Field>
        <Field label="8. Fuel type(s)">{input("fuel_types", "Grass, timber…")}</Field>
      </div>

      {showRaterFields && (
        <div className="space-y-4 rounded-2xl bg-card p-4 card-shadow">
          <p className="text-sm font-bold">Your information (rater)</p>
          <Field label="13. Rated by (name)">{input("rater_name", "Your full name")}</Field>
          <Field label="14. Home unit (address)">{input("rater_home_unit", "Your unit / agency")}</Field>
          <Field label="15. Position on fire">{input("rater_position", "e.g. DIVS, ICT4, TFLD")}</Field>
        </div>
      )}
    </div>
  );
}
