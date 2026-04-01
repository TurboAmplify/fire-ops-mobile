import { computeHours, type PersonnelEntry } from "@/services/shift-tickets";

interface Props {
  entry: PersonnelEntry;
  index: number;
  onChange: (index: number, updated: PersonnelEntry) => void;
  onRemove: (index: number) => void;
}

export function PersonnelEntryRow({ entry, index, onChange, onRemove }: Props) {
  const update = (field: keyof PersonnelEntry, value: string) => {
    const updated = { ...entry, [field]: value };
    // Auto-compute total from operating + standby hours
    if (["op_start", "op_stop", "sb_start", "sb_stop"].includes(field)) {
      const opHours = computeHours(
        field === "op_start" ? value : entry.op_start,
        field === "op_stop" ? value : entry.op_stop
      );
      const sbHours = computeHours(
        field === "sb_start" ? value : entry.sb_start,
        field === "sb_stop" ? value : entry.sb_stop
      );
      updated.total = Math.round((opHours + sbHours) * 10) / 10;
    }
    onChange(index, updated);
  };

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
          <label className="text-[10px] text-muted-foreground">24. Start (Operating)</label>
          <input type="time" value={entry.op_start} onChange={(e) => update("op_start", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">25. Stop (Operating)</label>
          <input type="time" value={entry.op_stop} onChange={(e) => update("op_stop", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">26. Start (Standby)</label>
          <input type="time" value={entry.sb_start} onChange={(e) => update("sb_start", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">27. Stop (Standby)</label>
          <input type="time" value={entry.sb_stop} onChange={(e) => update("sb_stop", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">28. Total</label>
          <input type="text" readOnly value={entry.total || ""}
            className="w-full rounded-lg border border-input bg-muted px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">29. Remarks</label>
          <input type="text" value={entry.remarks} onChange={(e) => update("remarks", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
    </div>
  );
}
