import { useIncidentDailyCrew } from "@/hooks/useIncidentDailyCrew";
import { Loader2, Users } from "lucide-react";

interface Props {
  incidentId: string;
}

function formatDateShort(d: string) {
  // d is YYYY-MM-DD; render as M/D
  const [, m, day] = d.split("-");
  return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
}

function formatDow(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

export function IncidentDailyCrewGrid({ incidentId }: Props) {
  const { data, isLoading, error } = useIncidentDailyCrew(incidentId);

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

      {data && data.dates.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card text-left font-semibold text-muted-foreground py-2 pr-3 min-w-[120px] border-b border-border">
                  Crew
                </th>
                {data.dates.map((d) => (
                  <th
                    key={d}
                    className="px-2 py-2 text-center font-semibold text-muted-foreground border-b border-border min-w-[52px]"
                  >
                    <div className="text-[10px] uppercase">{formatDow(d)}</div>
                    <div>{formatDateShort(d)}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-bold text-foreground border-b border-border min-w-[52px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.crew.map((c) => (
                <tr key={c.id}>
                  <td className="sticky left-0 z-10 bg-card py-2 pr-3 border-b border-border">
                    <div className="font-semibold truncate">{c.name}</div>
                    {c.role && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {c.role}
                      </div>
                    )}
                  </td>
                  {data.dates.map((d) => {
                    const cell = data.cells[c.id]?.[d];
                    return (
                      <td
                        key={d}
                        className="px-2 py-2 text-center border-b border-border"
                        title={cell ? `${cell.hours.toFixed(1)}h on ${cell.trucks.join(", ")}` : ""}
                      >
                        {cell ? (
                          <span className="font-semibold">{cell.hours.toFixed(1)}</span>
                        ) : (
                          <span className="text-muted-foreground">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-bold border-b border-border bg-secondary/40">
                    {(data.totalsByCrew[c.id] ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-card py-2 pr-3 font-bold">
                  Total
                </td>
                {data.dates.map((d) => (
                  <td key={d} className="px-2 py-2 text-center font-bold bg-secondary/40">
                    {(data.totalsByDate[d] ?? 0).toFixed(1)}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-extrabold bg-secondary">
                  {Object.values(data.totalsByCrew).reduce((a, b) => a + b, 0).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Hours per crew member per day across all trucks on this incident.
          </p>
        </div>
      )}
    </div>
  );
}
