import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useOrgPayrollSettings, useSaveOrgPayrollSettings } from "@/hooks/useOrgPayrollSettings";
import { DEFAULT_ORG_PAYROLL } from "@/lib/payroll";

const inputClass =
  "w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target";

export function PayrollSettingsCard() {
  const { data, isLoading } = useOrgPayrollSettings();
  const save = useSaveOrgPayrollSettings();

  const [form, setForm] = useState({
    federal_pct: String(DEFAULT_ORG_PAYROLL.federal_pct),
    social_security_pct: String(DEFAULT_ORG_PAYROLL.social_security_pct),
    medicare_pct: String(DEFAULT_ORG_PAYROLL.medicare_pct),
    state_pct: String(DEFAULT_ORG_PAYROLL.state_pct),
    state_enabled: DEFAULT_ORG_PAYROLL.state_enabled,
    extra_withholding_default: String(DEFAULT_ORG_PAYROLL.extra_withholding_default),
    workers_comp_pct: String(DEFAULT_ORG_PAYROLL.workers_comp_pct),
    factoring_pct: String(DEFAULT_ORG_PAYROLL.factoring_pct),
    factoring_enabled: DEFAULT_ORG_PAYROLL.factoring_enabled,
  });

  useEffect(() => {
    if (data) {
      setForm({
        federal_pct: String(data.federal_pct),
        social_security_pct: String(data.social_security_pct),
        medicare_pct: String(data.medicare_pct),
        state_pct: String(data.state_pct),
        state_enabled: data.state_enabled,
        extra_withholding_default: String(data.extra_withholding_default),
        workers_comp_pct: String(data.workers_comp_pct ?? 0),
        factoring_pct: String(data.factoring_pct ?? DEFAULT_ORG_PAYROLL.factoring_pct),
        factoring_enabled: data.factoring_enabled ?? DEFAULT_ORG_PAYROLL.factoring_enabled,
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        federal_pct: Number(form.federal_pct) || 0,
        social_security_pct: Number(form.social_security_pct) || 0,
        medicare_pct: Number(form.medicare_pct) || 0,
        state_pct: Number(form.state_pct) || 0,
        state_enabled: form.state_enabled,
        extra_withholding_default: Number(form.extra_withholding_default) || 0,
        workers_comp_pct: Number(form.workers_comp_pct) || 0,
        factoring_pct: Number(form.factoring_pct) || 0,
        factoring_enabled: form.factoring_enabled,
      });
      toast.success("Payroll defaults saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-card p-4 card-shadow">
      <div>
        <h3 className="text-sm font-bold">Withholding Defaults</h3>
        <p className="text-[11px] text-muted-foreground">
          Applied to all crew unless overridden on their profile.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Federal %</label>
          <input
            type="number" step="0.01" min="0"
            value={form.federal_pct}
            onChange={(e) => setForm({ ...form, federal_pct: e.target.value })}
            className={inputClass}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Extra withholding ($)</label>
          <input
            type="number" step="0.01" min="0"
            value={form.extra_withholding_default}
            onChange={(e) => setForm({ ...form, extra_withholding_default: e.target.value })}
            className={inputClass}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Social Security %</label>
          <input
            type="number" step="0.01" min="0"
            value={form.social_security_pct}
            onChange={(e) => setForm({ ...form, social_security_pct: e.target.value })}
            className={inputClass}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Medicare %</label>
          <input
            type="number" step="0.01" min="0"
            value={form.medicare_pct}
            onChange={(e) => setForm({ ...form, medicare_pct: e.target.value })}
            className={inputClass}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
        <span className="text-sm font-medium">Apply state withholding</span>
        <Switch
          checked={form.state_enabled}
          onCheckedChange={(v) => setForm({ ...form, state_enabled: v })}
        />
      </div>

      {form.state_enabled && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">State %</label>
          <input
            type="number" step="0.01" min="0"
            value={form.state_pct}
            onChange={(e) => setForm({ ...form, state_pct: e.target.value })}
            className={inputClass}
            inputMode="decimal"
          />
        </div>
      )}

      <div className="pt-2 border-t">
        <h3 className="text-sm font-bold">Employer Costs</h3>
        <p className="text-[11px] text-muted-foreground mb-2">
          Captured in P&L reports as your true cost of labor (in addition to FICA match).
        </p>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Workers Comp % (of gross)</label>
          <input
            type="number" step="0.01" min="0"
            value={form.workers_comp_pct}
            onChange={(e) => setForm({ ...form, workers_comp_pct: e.target.value })}
            className={inputClass}
            inputMode="decimal"
            placeholder="e.g. 8.50"
          />
        </div>
      </div>

      <div className="pt-2 border-t">
        <h3 className="text-sm font-bold">Invoice Factoring</h3>
        <p className="text-[11px] text-muted-foreground mb-2">
          Factor fee deducted from revenue in P&L. Toggle off for what-if analysis.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 mb-2">
          <span className="text-sm font-medium">Apply factoring to P&L</span>
          <Switch
            checked={form.factoring_enabled}
            onCheckedChange={(v) => setForm({ ...form, factoring_enabled: v })}
          />
        </div>
        {form.factoring_enabled && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, factoring_pct: "3" })}
                className={`rounded-xl py-2 text-sm font-medium transition-colors ${
                  form.factoring_pct === "3"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-foreground hover:bg-muted/60"
                }`}
              >
                3% (paid &lt;45d)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, factoring_pct: "4.5" })}
                className={`rounded-xl py-2 text-sm font-medium transition-colors ${
                  form.factoring_pct === "4.5"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-foreground hover:bg-muted/60"
                }`}
              >
                4.5% (45d+)
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Custom factor %</label>
              <input
                type="number" step="0.01" min="0"
                value={form.factoring_pct}
                onChange={(e) => setForm({ ...form, factoring_pct: e.target.value })}
                className={inputClass}
                inputMode="decimal"
              />
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={save.isPending}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Defaults
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Estimated Withholding — Not Official Tax Calculation
      </p>
    </div>
  );
}
