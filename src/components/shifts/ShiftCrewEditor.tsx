import type { ShiftCrewEntry } from "@/services/shifts";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { X, Plus } from "lucide-react";
import { useState } from "react";

interface Props {
  entries: ShiftCrewEntry[];
  onChange: (entries: ShiftCrewEntry[]) => void;
  incidentTruckId: string;
}

function computeHoursFromTimes(start?: string | null, stop?: string | null): number {
  if (!start || !stop) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = stop.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

export function ShiftCrewEditor({ entries, onChange, incidentTruckId }: Props) {
  const { data: truckCrew } = useIncidentTruckCrew(incidentTruckId);
  const [showAdd, setShowAdd] = useState(false);

  const entryIds = new Set(entries.map((e) => e.crew_member_id));
  const addable = truckCrew?.filter(
    (c) => c.is_active && !entryIds.has(c.crew_member_id)
  ) ?? [];

  const updateEntry = (index: number, field: keyof ShiftCrewEntry, value: string | number | null) => {
    const updated = [...entries];
    const entry = { ...updated[index], [field]: value };

    // Auto-calculate total hours from operating + standby
    if (["operating_start", "operating_stop", "standby_start", "standby_stop"].includes(field)) {
      const opHours = computeHoursFromTimes(entry.operating_start, entry.operating_stop);
      const sbHours = computeHoursFromTimes(entry.standby_start, entry.standby_stop);
      entry.hours = Math.round((opHours + sbHours) * 10) / 10;
    }

    updated[index] = entry;
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
        hours: 0,
        role_on_shift: role,
        notes: null,
        operating_start: null,
        operating_stop: null,
        standby_start: null,
        standby_stop: null,
      },
    ]);
    setShowAdd(false);
  };

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

      {/* Column headers */}
      {entries.length > 0 && (
        <div className="grid grid-cols-[1fr_auto] gap-2 px-1">
          <div className="grid grid-cols-2 gap-2">
            <p className="text-[10px] font-bold text-primary uppercase">Operating</p>
            <p className="text-[10px] font-bold text-primary uppercase">Standby</p>
          </div>
          <div className="w-10" />
        </div>
      )}

      {/* Crew entry cards */}
      {entries.map((entry, i) => {
        const opHours = computeHoursFromTimes(entry.operating_start, entry.operating_stop);
        const sbHours = computeHoursFromTimes(entry.standby_start, entry.standby_stop);

        return (
          <div key={entry.crew_member_id} className="rounded-xl bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{getName(entry.crew_member_id)}</p>
                <input
                  type="text"
                  value={entry.role_on_shift || ""}
                  onChange={(e) => updateEntry(i, "role_on_shift", e.target.value)}
                  placeholder="Role"
                  className="text-[11px] text-muted-foreground bg-transparent outline-none w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{entry.hours}h</span>
                <button
                  onClick={() => removeEntry(i)}
                  className="rounded-lg p-1.5 text-destructive active:bg-destructive/10 touch-target"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Operating times */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Op Start</label>
                <input
                  type="time"
                  value={entry.operating_start || ""}
                  onChange={(e) => updateEntry(i, "operating_start", e.target.value || null)}
                  className="w-full rounded-lg border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Op Stop</label>
                <input
                  type="time"
                  value={entry.operating_stop || ""}
                  onChange={(e) => updateEntry(i, "operating_stop", e.target.value || null)}
                  className="w-full rounded-lg border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
            </div>

            {/* Standby times */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Standby Start</label>
                <input
                  type="time"
                  value={entry.standby_start || ""}
                  onChange={(e) => updateEntry(i, "standby_start", e.target.value || null)}
                  className="w-full rounded-lg border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Standby Stop</label>
                <input
                  type="time"
                  value={entry.standby_stop || ""}
                  onChange={(e) => updateEntry(i, "standby_stop", e.target.value || null)}
                  className="w-full rounded-lg border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
            </div>

            {/* Hours breakdown */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>Op: {opHours}h / Standby: {sbHours}h</span>
              <span className="font-semibold text-foreground">Total: {entry.hours}h</span>
            </div>

            {/* Notes */}
            <input
              type="text"
              value={entry.notes || ""}
              onChange={(e) => updateEntry(i, "notes", e.target.value)}
              placeholder="Travel/Other remarks"
              className="w-full rounded-lg border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
            />
          </div>
        );
      })}

      {entries.length > 0 && (
        <div className="flex justify-between text-sm font-medium px-1">
          <span className="text-muted-foreground">Total hours</span>
          <span>{entries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
