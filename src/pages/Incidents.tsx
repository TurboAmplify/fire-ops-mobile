import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getIncidents, STATUS_LABELS } from "@/lib/incidents";
import { useState } from "react";
import type { IncidentStatus } from "@/lib/incidents";

const filters: (IncidentStatus | "all")[] = ["all", "active", "contained", "controlled", "out"];

export default function Incidents() {
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const incidents = getIncidents();
  const filtered = filter === "all" ? incidents : incidents.filter((i) => i.status === filter);

  return (
    <AppShell
      title="Incidents"
      headerRight={
        <Link
          to="/incidents/new"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
      }
    >
      <div className="p-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors touch-target ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Incident list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No incidents found.</p>
          )}
          {filtered.map((inc) => (
            <Link
              key={inc.id}
              to={`/incidents/${inc.id}`}
              className="block rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">{inc.name}</p>
                  <p className="text-sm text-muted-foreground">{inc.location}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                    inc.status === "active"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {inc.status}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                {inc.acres != null && <span>{inc.acres.toLocaleString()} acres</span>}
                {inc.containment != null && <span>{inc.containment}% contained</span>}
                <span>Started {inc.startDate}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
