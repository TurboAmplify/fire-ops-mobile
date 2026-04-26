import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, FileUp, Flame, AlertTriangle } from "lucide-react";
import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentsWithOF286 } from "@/hooks/useIncidentDocuments";
import { STATUS_LABELS, STATUS_COLORS } from "@/services/incidents";
import { useState, useMemo } from "react";
import type { IncidentStatus } from "@/services/incidents";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CachedDataPill, OfflineNoCacheEmpty } from "@/components/OfflineIndicators";

const filters: (IncidentStatus | "all")[] = ["all", "active", "demob", "closed"];

export default function Incidents() {
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const { data: incidents, isLoading, error } = useIncidents();
  const { isOffline } = useOnlineStatus();

  const incidentIds = useMemo(() => (incidents ?? []).map((i) => i.id), [incidents]);
  const { data: of286Set } = useIncidentsWithOF286(incidentIds);

  const filtered =
    incidents && filter === "all"
      ? incidents
      : incidents?.filter((i) => i.status === filter) ?? [];

  return (
    <AppShell
      title="Incidents"
      headerRight={
        <div className="flex items-center gap-1.5">
          <Link
            to="/incidents/from-agreement"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-secondary text-secondary-foreground active:bg-secondary/70"
          >
            <FileUp className="h-4 w-4" />
          </Link>
          <Link
            to="/incidents/new"
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 h-9 text-sm font-semibold text-primary-foreground active:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                filter === f
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground active:bg-secondary/70"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Cached-data indicator */}
        {isOffline && incidents && incidents.length > 0 && <CachedDataPill />}

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !isOffline && (
          <p className="py-16 text-center text-destructive text-sm">
            Failed to load incidents.
          </p>
        )}

        {/* Offline + no cache */}
        {!isLoading && isOffline && !incidents && <OfflineNoCacheEmpty label="incidents" />}

        {/* Incident list */}
        {!isLoading && !error && incidents && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No incidents found.</p>
              </div>
            )}
            {filtered.map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="block rounded-2xl bg-card p-4 card-shadow transition-all duration-150 active:scale-[0.98] active:shadow-none"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-semibold text-[15px]">{inc.name}</p>
                    <p className="text-xs text-muted-foreground">{inc.location}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ml-3 shrink-0 ${
                      STATUS_COLORS[inc.status as IncidentStatus] || "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[inc.status as IncidentStatus] || inc.status}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  {inc.acres != null && <span>{Number(inc.acres).toLocaleString()} acres</span>}
                  {inc.containment != null && <span>{inc.containment}% contained</span>}
                  <span>Started {inc.start_date}</span>
                  {of286Set && !of286Set.has(inc.id) && (inc.status === "demob" || inc.status === "closed") && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      inc.status === "closed"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }`}>
                      <AlertTriangle className="h-3 w-3" />
                      Missing OF-286
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
