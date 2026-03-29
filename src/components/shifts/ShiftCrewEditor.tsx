import type { ShiftCrewEntry } from "@/services/shifts";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { X, Plus } from "lucide-react";
import { useState } from "react";

interface Props {
  entries: ShiftCrewEntry[];
  onChange: (entries: ShiftCrewEntry[]) => void;
  incidentTruckId: string;
}

export function ShiftCrewEditor({ entries, onChange, incidentTruckId }: Props) {
  const { data: truckCrew } = useIncidentTruckCrew(incidentTruckId);
  const [showAdd, setShowAdd] = useState(false);

  const entryIds = new Set(entries.map((e) => e.crew_member_id));
  const addable = truckCrew?.filter(
    (c) => c.is_active && !entryIds.has(c.crew_member_id)
  ) ?? [];

  const updateEntry = (index: number, field: keyof ShiftCrewEntry, value: string | number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = (crewMemberId: string, role: string) => {
    onChange([
      ...entries,
      {
        crew_member_id: crewMemberId,
        hours: entries[0]?.hours ?? 12,
        role_on_shift: role,
        notes: null,
      },
    ]);
    setShowAdd(false);
  };

  // Resolve crew member names from truckCrew data
  const getName = (crewMemberId: string) => {
    const found = truckCrew?.find((c) => c.crew_member_id === crewMemberId);
    return found?.crew_members.name ?? "Unknown";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">
          Crew on this shift ({entries.length})
        </p>
        {addable.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs font-medium text-primary touch-target"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Add picker */}
      {showAdd && (
        <div className="rounded-lg bg-secondary p-2 space-y-1 max-h-40 overflow-y-auto">
          {addable.map((c) => (
            <button
              key={c.crew_member_id}
              onClick={() =>
                addEntry(c.crew_member_id, c.role_on_assignment || c.crew_members.role)
              }
              className="flex w-full items-center justify-between rounded-md p-2 text-left text-sm active:bg-accent touch-target"
            >
              <span className="font-medium">{c.crew_members.name}</span>
              <span className="text-xs text-muted-foreground">{c.crew_members.role}</span>
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No crew to log. Assign crew to this truck first.
        </p>
      )}

      {/* Crew entry cards */}
      {entries.map((entry, i) => (
        <div key={entry.crew_member_id} className="rounded-xl bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{getName(entry.crew_member_id)}</p>
              <input
                type="text"
                value={entry.role_on_shift || ""}
                onChange={(e) => updateEntry(i, "role_on_shift", e.target.value)}
                placeholder="Role"
                className="text-[11px] text-muted-foreground bg-transparent outline-none w-32"
              />
            </div>
            <button
              onClick={() => removeEntry(i)}
              className="rounded-lg p-2 text-destructive active:bg-destructive/10 touch-target"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Hours</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="24"
                value={entry.hours}
                onChange={(e) => updateEntry(i, "hours", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Notes</label>
              <input
                type="text"
                value={entry.notes || ""}
                onChange={(e) => updateEntry(i, "notes", e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>
          </div>
        </div>
      ))}

      {entries.length > 0 && (
        <div className="flex justify-between text-sm font-medium px-1">
          <span className="text-muted-foreground">Total hours</span>
          <span>{entries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
