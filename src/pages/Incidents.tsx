import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, FileUp } from "lucide-react";
import { useIncidents } from "@/hooks/useIncidents";
import { STATUS_LABELS } from "@/services/incidents";
import { useState } from "react";
import type { IncidentStatus } from "@/services/incidents";

const filters: (IncidentStatus | "all")[] = ["all", "active", "contained", "controlled", "out"];

export default function Incidents() {
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const { data: incidents, isLoading, error } = useIncidents();

  const filtered =
    incidents && filter === "all"
      ? incidents
      : incidents?.filter((i) => i.status === filter) ?? [];

  return (
    <AppShell
      title="Incidents"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            to="/incidents/from-agreement"
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground touch-target"
          >
            <FileUp className="h-4 w-4" />
            Import
          </Link>
          <Link
            to="/incidents/new"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
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

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-12 text-center text-destructive">
            Failed to load incidents. Pull down to retry.
          </p>
        )}

        {/* Incident list */}
        {!isLoading && !error && (
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
                  {inc.acres != null && <span>{Number(inc.acres).toLocaleString()} acres</span>}
                  {inc.containment != null && <span>{inc.containment}% contained</span>}
                  <span>Started {inc.start_date}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
