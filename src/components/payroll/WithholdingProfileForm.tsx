import { Switch } from "@/components/ui/switch";

export interface WithholdingProfileValues {
  filing_status: "single" | "married_jointly";
  dependents_count: string;
  use_default_withholding: boolean;
  federal_pct_override: string;
  extra_withholding: string;
  state_pct_override: string;
  social_security_exempt: boolean;
  medicare_exempt: boolean;
  other_deductions: string;
  notes: string;
}

export const EMPTY_WITHHOLDING: WithholdingProfileValues = {
  filing_status: "single",
  dependents_count: "0",
  use_default_withholding: true,
  federal_pct_override: "",
  extra_withholding: "0",
  state_pct_override: "",
  social_security_exempt: false,
  medicare_exempt: false,
  other_deductions: "0",
  notes: "",
};

interface Props {
  values: WithholdingProfileValues;
  onChange: (next: WithholdingProfileValues) => void;
}

const inputClass =
  "w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target";

export function WithholdingProfileForm({ values, onChange }: Props) {
  const set = <K extends keyof WithholdingProfileValues>(k: K, v: WithholdingProfileValues[K]) =>
    onChange({ ...values, [k]: v });

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Filing Status</label>
        <select
          value={values.filing_status}
          onChange={(e) => set("filing_status", e.target.value as any)}
          className={inputClass}
        >
          <option value="single">Single</option>
          <option value="married_jointly">Married Filing Jointly</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Dependents</label>
        <input
          type="number"
          min="0"
          value={values.dependents_count}
          onChange={(e) => set("dependents_count", e.target.value)}
          className={inputClass}
          inputMode="numeric"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-card p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Use org default withholding</p>
          <p className="text-[11px] text-muted-foreground">Off lets you set a custom federal/state %</p>
        </div>
        <Switch
          checked={values.use_default_withholding}
          onCheckedChange={(v) => set("use_default_withholding", v)}
        />
      </div>

      {!values.use_default_withholding && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Federal % override</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.federal_pct_override}
              onChange={(e) => set("federal_pct_override", e.target.value)}
              className={inputClass}
              placeholder="10.00"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">State % override</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.state_pct_override}
              onChange={(e) => set("state_pct_override", e.target.value)}
              className={inputClass}
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Extra withholding ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.extra_withholding}
            onChange={(e) => set("extra_withholding", e.target.value)}
            className={inputClass}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Other deductions ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.other_deductions}
            onChange={(e) => set("other_deductions", e.target.value)}
            className={inputClass}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-card p-3">
        <span className="text-sm font-medium">Social Security exempt</span>
        <Switch
          checked={values.social_security_exempt}
          onCheckedChange={(v) => set("social_security_exempt", v)}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-card p-3">
        <span className="text-sm font-medium">Medicare exempt</span>
        <Switch
          checked={values.medicare_exempt}
          onCheckedChange={(v) => set("medicare_exempt", v)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Notes</label>
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className={inputClass + " min-h-[60px]"}
          placeholder="Any payroll-specific notes"
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Estimated payroll only — not a licensed payroll service, not tax advice.
        Withholdings are simplified flat rates, not IRS tax tables. Changes apply to current
        and future payroll views; previously downloaded paystubs are unchanged.
      </p>
    </div>
  );
}
