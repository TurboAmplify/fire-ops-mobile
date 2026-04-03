import { ChevronDown, ChevronUp } from "lucide-react";
import { computeHours, buildRemarksString, type PersonnelEntry } from "@/services/shift-tickets";
import { MilitaryTimeInput } from "./MilitaryTimeInput";

interface Props {
  entry: PersonnelEntry;
  index: number;
  onChange: (index: number, updated: PersonnelEntry) => void;
  onRemove: (index: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function PersonnelEntryRow({ entry, index, onChange, onRemove, collapsed, onToggle }: Props) {
  const update = (field: keyof PersonnelEntry, value: string | boolean) => {
    const updated = { ...entry, [field]: value };
    if (["op_start", "op_stop", "sb_start", "sb_stop"].includes(field as string)) {
      const opHours = computeHours(
        field === "op_start" ? (value as string) : entry.op_start,
        field === "op_stop" ? (value as string) : entry.op_stop
      );
      const sbHours = computeHours(
        field === "sb_start" ? (value as string) : entry.sb_start,
        field === "sb_stop" ? (value as string) : entry.sb_stop
      );
      updated.total = Math.round((opHours + sbHours) * 10) / 10;
    }
    if (["activity_type", "work_context", "lodging", "per_diem_b", "per_diem_l", "per_diem_d"].includes(field as string)) {
      updated.remarks = buildRemarksString(updated);
    }
    onChange(index, updated);
  };

  const activityType = entry.activity_type || "work";
  const timeInputClass = "w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

  // Build badge list
  const badges: string[] = [];
  if (entry.lodging) badges.push("Lodging");
  const meals: string[] = [];
  if (entry.per_diem_b) meals.push("B");
  if (entry.per_diem_l) meals.push("L");
  if (entry.per_diem_d) meals.push("D");
  if (meals.length > 0) badges.push(`Per Diem (${meals.join(",")})`);

  // Summary row (always visible)
  const summaryRow = (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 touch-target"
    >
      <div className="flex flex-col items-start gap-0.5 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold truncate">{entry.operator_name || `Crew ${index + 1}`}</span>
          <span className="text-xs text-muted-foreground shrink-0">{entry.date}</span>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {badges.map((b) => (
              <span key={b} className="text-[10px] font-medium rounded-full bg-primary/10 text-primary px-2 py-0.5">{b}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-primary">{entry.total || 0}h</span>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </div>
    </button>
  );

  if (collapsed) {
    return (
      <div className="rounded-xl border border-border bg-card">
        {summaryRow}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {summaryRow}
      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">Edit Crew Row {index + 1}</span>
          <button onClick={() => onRemove(index)} className="text-xs text-destructive touch-target">Remove</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">22. Date</label>
            <input type="date" value={entry.date} onChange={(e) => update("date", e.target.value)} className={timeInputClass} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">23. Operator Name</label>
            <input type="text" value={entry.operator_name} onChange={(e) => update("operator_name", e.target.value)} className={timeInputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">24. Op Start (24h)</label>
            <MilitaryTimeInput value={entry.op_start} onChange={(v) => update("op_start", v)} className={timeInputClass} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">25. Op Stop (24h)</label>
            <MilitaryTimeInput value={entry.op_stop} onChange={(v) => update("op_stop", v)} className={timeInputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">26. SB Start (24h)</label>
            <MilitaryTimeInput value={entry.sb_start} onChange={(v) => update("sb_start", v)} className={timeInputClass} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">27. SB Stop (24h)</label>
            <MilitaryTimeInput value={entry.sb_stop} onChange={(v) => update("sb_stop", v)} className={timeInputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">28. Total</label>
            <input type="text" readOnly value={entry.total || ""} className="w-full rounded-lg border border-input bg-muted px-2 py-2 text-sm" />
          </div>
        </div>

        {/* Structured Remarks */}
        <div className="space-y-2 border-t border-border pt-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">29. Remarks</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => update("activity_type", "travel")}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${activityType === "travel" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              Travel/Check-In
            </button>
            <button type="button" onClick={() => update("activity_type", "work")}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${activityType === "work" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              Work
            </button>
          </div>
          {activityType === "work" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Work Context (e.g. IA2 - Johnson Hill Fire)</label>
              <input type="text" value={entry.work_context || ""} onChange={(e) => update("work_context", e.target.value)}
                placeholder="IA2 - Fire Name" className={timeInputClass} />
            </div>
          )}
          <label className="flex items-center gap-2 touch-target">
            <input type="checkbox" checked={entry.lodging || false} onChange={(e) => update("lodging", e.target.checked)}
              className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm">Lodging</span>
          </label>
          <div>
            <span className="text-[10px] text-muted-foreground">Per Diem</span>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1.5 touch-target">
                <input type="checkbox" checked={entry.per_diem_b || false} onChange={(e) => update("per_diem_b", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm font-medium">B</span>
              </label>
              <label className="flex items-center gap-1.5 touch-target">
                <input type="checkbox" checked={entry.per_diem_l || false} onChange={(e) => update("per_diem_l", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm font-medium">L</span>
              </label>
              <label className="flex items-center gap-1.5 touch-target">
                <input type="checkbox" checked={entry.per_diem_d || false} onChange={(e) => update("per_diem_d", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm font-medium">D</span>
              </label>
            </div>
          </div>
          {entry.remarks && (
            <p className="text-[10px] text-muted-foreground italic">{entry.remarks}</p>
          )}
        </div>
      </div>
    </div>
  );
}
