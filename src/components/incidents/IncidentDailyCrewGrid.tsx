import { useState, useMemo } from "react";
import { useIncidentDailyCrew, type DailyCrewStatus } from "@/hooks/useIncidentDailyCrew";
import { Loader2, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  incidentId: string;
}

function formatDateShort(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
}

function formatDow(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

function formatLongDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<DailyCrewStatus, string> = {
  draft: "Draft",
  awaiting_supervisor: "Awaiting Supervisor",
  complete: "Complete",
};

const STATUS_CLASSES: Record<DailyCrewStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_supervisor: "bg-warning/15 text-warning",
  complete: "bg-success/15 text-success",
};

function StatusPill({ status }: { status: DailyCrewStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function IncidentDailyCrewGrid({ incidentId }: Props) {
  const { data, isLoading, error } = useIncidentDailyCrew(incidentId);
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);

  // Default to most recent date when data loads
  const effectiveIdx = useMemo(() => {
    if (!data || data.dates.length === 0) return null;
    if (selectedDateIdx === null) return data.dates.length - 1;
    return Math.max(0, Math.min(selectedDateIdx, data.dates.length - 1));
  }, [data, selectedDateIdx]);

  return (
    <div className="rounded-xl bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Daily Crew
        </h3>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load daily crew.</p>
      )}

      {data && data.dates.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No shifts logged yet. Crew hours will appear here once shifts are added.
        </p>
      )}

      {data && data.dates.length > 0 && effectiveIdx !== null && (
        <div className="space-y-4">
          {/* Date selector — horizontal pill strip */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateIdx(Math.max(0, effectiveIdx - 1))}
              disabled={effectiveIdx === 0}
              className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-30"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto py-1">
              {data.dates.map((d, idx) => {
                const active = idx === effectiveIdx;
                const total = data.totalsByDate[d] ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDateIdx(idx)}
                    className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[60px] transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase opacity-80">
                      {formatDow(d)}
                    </span>
                    <span className="text-sm font-bold">{formatDateShort(d)}</span>
                    <span className="text-[10px] font-medium opacity-80">
                      {total.toFixed(1)}h
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDateIdx(Math.min(data.dates.length - 1, effectiveIdx + 1))
              }
              disabled={effectiveIdx === data.dates.length - 1}
              className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Selected day summary */}
          <div className="flex items-baseline justify-between border-b border-border pb-2">
            <p className="text-sm font-semibold">
              {formatLongDate(data.dates[effectiveIdx])}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">
                {(data.totalsByDate[data.dates[effectiveIdx]] ?? 0).toFixed(1)}
              </span>{" "}
              total hours
            </p>
          </div>

          {/* Crew list for selected day */}
          <div className="space-y-2">
            {data.crew
              .map((c) => {
                const cell = data.cells[c.id]?.[data.dates[effectiveIdx]];
                return { c, cell };
              })
              .filter(({ cell }) => cell && cell.hours > 0)
              .map(({ c, cell }) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {cell!.trucks.join(", ")}
                      {c.role ? ` · ${c.role}` : ""}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-base font-bold">{cell!.hours.toFixed(1)}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">hrs</p>
                  </div>
                </div>
              ))}

            {data.crew.every(
              (c) => !data.cells[c.id]?.[data.dates[effectiveIdx]]
            ) && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No crew hours logged for this day.
              </p>
            )}
          </div>

          {/* Incident totals footer */}
          <div className="rounded-lg bg-secondary px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Incident total (all days)
              </p>
              <p className="text-base font-extrabold">
                {Object.values(data.totalsByCrew)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(1)}
                h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
