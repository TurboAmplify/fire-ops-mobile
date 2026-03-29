import { AppShell } from "@/components/AppShell";
import { useAllShifts } from "@/hooks/useShifts";
import { useIncidents } from "@/hooks/useIncidents";
import { Loader2, Sun, Moon, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { ShiftWithRelations } from "@/services/shifts";

export default function Time() {
  const { data: shifts, isLoading, error } = useAllShifts();
  const { data: incidents } = useIncidents();
  const [incidentFilter, setIncidentFilter] = useState("all");
  const [truckFilter, setTruckFilter] = useState("all");

  // Derive truck options from filtered shifts
  const filteredByIncident = useMemo(() => {
    if (!shifts) return [];
    if (incidentFilter === "all") return shifts;
    return shifts.filter((s) => s.incident_trucks?.incidents?.id === incidentFilter);
  }, [shifts, incidentFilter]);

  const truckOptions = useMemo(() => {
    const map = new Map<string, string>();
    filteredByIncident.forEach((s) => {
      const t = s.incident_trucks?.trucks;
      if (t) map.set(t.id, t.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [filteredByIncident]);

  const filtered = useMemo(() => {
    if (truckFilter === "all") return filteredByIncident;
    return filteredByIncident.filter((s) => s.incident_trucks?.trucks?.id === truckFilter);
  }, [filteredByIncident, truckFilter]);

  // Total hours calculation (from shift times)
  const totalHours = useMemo(() => {
    return filtered.reduce((sum, s) => sum + computeShiftHours(s), 0);
  }, [filtered]);

  // Reset truck filter when incident changes
  const handleIncidentChange = (v: string) => {
    setIncidentFilter(v);
    setTruckFilter("all");
  };

  return (
    <AppShell title="Time">
      <div className="p-4 space-y-4">
        {/* Summary banner */}
        <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {filtered.length} shift{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-lg font-extrabold text-primary">
            {totalHours.toFixed(1)} hrs
          </span>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={incidentFilter}
            onChange={(e) => handleIncidentChange(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
          >
            <option value="all">All Incidents</option>
            {incidents?.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.name}</option>
            ))}
          </select>

          {truckOptions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              <FilterChip
                label="All Trucks"
                active={truckFilter === "all"}
                onClick={() => setTruckFilter("all")}
              />
              {truckOptions.map(([id, name]) => (
                <FilterChip
                  key={id}
                  label={name}
                  active={truckFilter === id}
                  onClick={() => setTruckFilter(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-12 text-center text-destructive">Failed to load shifts.</p>
        )}

        {/* Shift list */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-muted-foreground">No shifts logged yet.</p>
                <p className="text-xs text-muted-foreground">
                  Log shifts from an incident's truck assignment.
                </p>
              </div>
            )}

            {filtered.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ShiftCard({ shift }: { shift: ShiftWithRelations }) {
  const hours = computeShiftHours(shift);
  const incidentName = shift.incident_trucks?.incidents?.name ?? "Unknown";
  const truckName = shift.incident_trucks?.trucks?.name ?? "—";
  const incidentId = shift.incident_trucks?.incident_id;
  const incidentTruckId = shift.incident_trucks?.id;

  return (
    <Link
      to={`/incidents/${incidentId}/trucks/${incidentTruckId}/shifts/${shift.id}`}
      state={{ truckName }}
      className="block rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{incidentName}</p>
          <p className="text-xs text-muted-foreground">{truckName} · {shift.date}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            {shift.type === "day" ? (
              <Sun className="h-3.5 w-3.5 text-warning" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {shift.type}
            </span>
          </div>
          <span className="text-sm font-bold">{hours.toFixed(1)}h</span>
        </div>
      </div>
      {shift.notes && (
        <p className="mt-1.5 text-xs text-muted-foreground truncate">{shift.notes}</p>
      )}
    </Link>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors touch-target ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function computeShiftHours(shift: ShiftWithRelations): number {
  if (!shift.start_time || !shift.end_time) return 0;
  try {
    const start = new Date(shift.start_time).getTime();
    const end = new Date(shift.end_time).getTime();
    let diff = end - start;
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
  } catch {
    return 0;
  }
}
