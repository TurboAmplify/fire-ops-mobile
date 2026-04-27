import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgRoleDefaultRates,
  useSaveOrgRoleDefaultRate,
  useDeleteOrgRoleDefaultRate,
  type OrgRoleDefaultRate,
} from "@/hooks/useOrgRoleDefaultRates";
import { CREW_ROLES } from "@/lib/crew-roles";

const inputClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

interface RowState {
  role: string;
  pay_method: "hourly" | "daily";
  hourly_rate: string;
  hw_rate: string;
  daily_rate: string;
  dirty: boolean;
}

function toRowState(r: OrgRoleDefaultRate | undefined, role: string): RowState {
  return {
    role,
    pay_method: (r?.pay_method as any) === "daily" ? "daily" : "hourly",
    hourly_rate: r?.hourly_rate != null ? String(r.hourly_rate) : "",
    hw_rate: r?.hw_rate != null ? String(r.hw_rate) : "",
    daily_rate: r?.daily_rate != null ? String(r.daily_rate) : "",
    dirty: false,
  };
}

/**
 * Org-level table of default pay rates per crew role. Crew members whose
 * compensation has "Use organization default rate" enabled inherit these
 * values automatically, eliminating per-employee rate entry.
 */
export function RoleDefaultRatesCard() {
  const { data: rows, isLoading } = useOrgRoleDefaultRates();
  const save = useSaveOrgRoleDefaultRate();
  const del = useDeleteOrgRoleDefaultRate();

  // Render a row for every standard role, plus any custom roles that already
  // have a default saved (so admins can manage them too).
  const roleList = useMemo(() => {
    const standard = (CREW_ROLES as readonly string[]).filter((r) => r !== "Other");
    const extras = (rows ?? [])
      .map((r) => r.role)
      .filter((r) => !(standard as string[]).includes(r));
    return [...standard, ...extras];
  }, [rows]);

  const [state, setState] = useState<Record<string, RowState>>({});

  useEffect(() => {
    const next: Record<string, RowState> = {};
    roleList.forEach((role) => {
      const found = (rows ?? []).find((r) => r.role === role);
      next[role] = toRowState(found, role);
    });
    setState(next);
  }, [rows, roleList]);

  const update = (role: string, patch: Partial<RowState>) => {
    setState((prev) => ({ ...prev, [role]: { ...prev[role], ...patch, dirty: true } }));
  };

  const handleSave = async (role: string) => {
    const row = state[role];
    if (!row) return;
    try {
      await save.mutateAsync({
        role,
        pay_method: row.pay_method,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
        hw_rate: row.hw_rate ? parseFloat(row.hw_rate) : null,
        daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
      });
      setState((prev) => ({ ...prev, [role]: { ...prev[role], dirty: false } }));
      toast.success(`${role} default saved`);
    } catch {
      toast.error(`Failed to save ${role}`);
    }
  };

  const handleClear = async (role: string) => {
    if (!window.confirm(`Clear default rate for ${role}?`)) return;
    try {
      await del.mutateAsync(role);
      toast.success(`${role} default cleared`);
    } catch {
      toast.error(`Failed to clear ${role}`);
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
        <h3 className="text-sm font-bold">Default Pay Rates by Role</h3>
        <p className="text-[11px] text-muted-foreground">
          Set once per role. Crew with "Use org default rate" on inherit these automatically — no need to set rates per person.
        </p>
      </div>

      <div className="space-y-3">
        {roleList.map((role) => {
          const row = state[role];
          if (!row) return null;
          const hasAnyValue = !!(row.hourly_rate || row.hw_rate || row.daily_rate);
          return (
            <div key={role} className="rounded-lg border bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{role}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => update(role, { pay_method: "hourly" })}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
                      row.pay_method === "hourly"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground"
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => update(role, { pay_method: "daily" })}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
                      row.pay_method === "daily"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground"
                    }`}
                  >
                    Daily
                  </button>
                </div>
              </div>

              {row.pay_method === "hourly" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Hourly $</label>
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={row.hourly_rate}
                      onChange={(e) => update(role, { hourly_rate: e.target.value })}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">H&amp;W $</label>
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={row.hw_rate}
                      onChange={(e) => update(role, { hw_rate: e.target.value })}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-muted-foreground">Daily $/shift</label>
                  <input
                    type="number" step="0.01" min="0" inputMode="decimal"
                    value={row.daily_rate}
                    onChange={(e) => update(role, { daily_rate: e.target.value })}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {hasAnyValue && (
                  <button
                    type="button"
                    onClick={() => handleClear(role)}
                    disabled={del.isPending}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(role)}
                  disabled={save.isPending || !row.dirty}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
