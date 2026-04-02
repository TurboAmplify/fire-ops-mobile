import { computeHours, buildRemarksString, type PersonnelEntry } from "@/services/shift-tickets";

interface Props {
  entry: PersonnelEntry;
  index: number;
  onChange: (index: number, updated: PersonnelEntry) => void;
  onRemove: (index: number) => void;
}

export function PersonnelEntryRow({ entry, index, onChange, onRemove }: Props) {
  const update = (field: keyof PersonnelEntry, value: string | boolean) => {
    const updated = { ...entry, [field]: value };
    // Auto-compute total from operating + standby hours
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
    // Auto-compute remarks from structured fields
    if (["activity_type", "lodging", "per_diem_b", "per_diem_l", "per_diem_d"].includes(field as string)) {
      updated.remarks = buildRemarksString(updated);
    }
    onChange(index, updated);
  };

  const activityType = entry.activity_type || "work";

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">Personnel Row {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-xs text-destructive touch-target">Remove</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">22. Date</label>
          <input type="date" value={entry.date} onChange={(e) => update("date", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">23. Operator Name</label>
          <input type="text" value={entry.operator_name} onChange={(e) => update("operator_name", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">24. Start (Operating) - 24h</label>
          <input type="time" step="60" value={entry.op_start} onChange={(e) => update("op_start", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">25. Stop (Operating) - 24h</label>
          <input type="time" step="60" value={entry.op_stop} onChange={(e) => update("op_stop", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">26. Start (Standby) - 24h</label>
          <input type="time" step="60" value={entry.sb_start} onChange={(e) => update("sb_start", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">27. Stop (Standby) - 24h</label>
          <input type="time" step="60" value={entry.sb_stop} onChange={(e) => update("sb_stop", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">28. Total</label>
          <input type="text" readOnly value={entry.total || ""}
            className="w-full rounded-lg border border-input bg-muted px-2 py-2 text-sm" />
        </div>
      </div>

      {/* Structured Remarks */}
      <div className="space-y-2 border-t border-border pt-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase">29. Remarks</label>

        {/* Activity Type */}
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

        {/* Lodging */}
        <label className="flex items-center gap-2 touch-target">
          <input type="checkbox" checked={entry.lodging || false} onChange={(e) => update("lodging", e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary" />
          <span className="text-sm">Lodging</span>
        </label>

        {/* Per Diem */}
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

        {/* Computed remarks preview */}
        {entry.remarks && (
          <p className="text-[10px] text-muted-foreground italic">{entry.remarks}</p>
        )}
      </div>
    </div>
  );
}
