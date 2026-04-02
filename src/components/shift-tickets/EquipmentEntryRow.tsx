import { computeHours, type EquipmentEntry } from "@/services/shift-tickets";

interface Props {
  entry: EquipmentEntry;
  index: number;
  onChange: (index: number, updated: EquipmentEntry) => void;
  onRemove: (index: number) => void;
}

export function EquipmentEntryRow({ entry, index, onChange, onRemove }: Props) {
  const update = (field: keyof EquipmentEntry, value: string) => {
    const updated = { ...entry, [field]: value };
    if (field === "start" || field === "stop") {
      updated.total = computeHours(
        field === "start" ? value : entry.start,
        field === "stop" ? value : entry.stop
      );
    }
    onChange(index, updated);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">Equipment Row {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-xs text-destructive touch-target">Remove</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">15. Date</label>
          <input type="date" value={entry.date} onChange={(e) => update("date", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">16. Start - 24h</label>
          <input type="time" step="60" value={entry.start} onChange={(e) => update("start", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">17. Stop - 24h</label>
          <input type="time" step="60" value={entry.stop} onChange={(e) => update("stop", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring military-time" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">18. Total</label>
          <input type="text" readOnly value={entry.total || ""}
            className="w-full rounded-lg border border-input bg-muted px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">19. Quantity</label>
          <input type="text" inputMode="numeric" value={entry.quantity} onChange={(e) => update("quantity", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">20. Type</label>
          <input type="text" value={entry.type} onChange={(e) => update("type", e.target.value)}
            placeholder="Special/Day"
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">21. Remarks</label>
        <input type="text" value={entry.remarks} onChange={(e) => update("remarks", e.target.value)}
          placeholder="Travel/other remarks"
          className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
      </div>
    </div>
  );
}
