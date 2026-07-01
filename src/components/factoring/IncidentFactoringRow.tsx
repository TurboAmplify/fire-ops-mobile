import { useState } from "react";
import { ChevronDown, CheckCircle2, Clock, CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { IncidentGroup } from "@/hooks/useFactoringDashboard";
import { useSetReserveReleased } from "@/hooks/useFactoringDashboard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtExact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

type Status = "none" | "held" | "partial" | "closed";
function incidentStatus(g: IncidentGroup): Status {
  if (g.totals.count === 0) return "none";
  if (g.totals.reserveHeld === 0 && g.totals.released > 0) return "closed";
  if (g.totals.released > 0 && g.totals.reserveHeld > 0) return "partial";
  return "held";
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "none")
    return (
      <Badge variant="outline" className="border-border/60 text-muted-foreground">
        <CircleDashed className="mr-1 h-3 w-3" /> Not submitted
      </Badge>
    );
  if (status === "closed")
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Closed out
      </Badge>
    );
  if (status === "partial")
    return (
      <Badge className="bg-sky-600 text-white hover:bg-sky-600">
        <Clock className="mr-1 h-3 w-3" /> Partially released
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15">
      <Clock className="mr-1 h-3 w-3" /> Reserve held
    </Badge>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "primary" | "amber" | "emerald" | "muted" }) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-[13px] font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

export function IncidentFactoringRow({ group }: { group: IncidentGroup }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setReleased = useSetReserveReleased();
  const status = incidentStatus(group);
  const hasData = group.totals.count > 0;

  const start = fmtDate(group.incident_start_date);
  const end = fmtDate(group.incident_end_date);
  const dateRange = start && end ? `${start} – ${end}` : start ?? end ?? null;

  return (
    <Card className={`overflow-hidden ${!hasData ? "bg-muted/20" : ""}`}>
      <button
        onClick={() => (hasData ? setOpen((v) => !v) : navigate(`/incidents/${group.incident_id}`))}
        className="w-full px-4 py-3 text-left transition-colors active:bg-secondary/50"
        aria-expanded={open}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{group.incident_name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {dateRange && <span>{dateRange}</span>}
              {hasData && (
                <span>· {group.totals.count} schedule{group.totals.count === 1 ? "" : "s"}</span>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
          {hasData && (
            <ChevronDown className={`h-4 w-4 mt-1 shrink-0 text-muted-foreground/70 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Metric label="Submitted" value={fmt(group.totals.submitted)} />
          <Metric label="Advanced" value={fmt(group.totals.advanced)} tone={hasData ? "primary" : "muted"} />
          <Metric label="Held" value={fmt(group.totals.reserveHeld)} tone={group.totals.reserveHeld > 0 ? "amber" : "muted"} />
          <Metric label="Released" value={fmt(group.totals.released)} tone={group.totals.released > 0 ? "emerald" : "muted"} />
        </div>
      </button>

      {open && hasData && (
        <div className="border-t border-border/60 divide-y divide-border/50 bg-muted/10">
          {group.submissions.map((s) => {
            const released = !!s.reserve_released_at;
            return (
              <div key={s.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Schedule #{s.schedule_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted {fmtDate(s.submitted_at)} · {s.account_count} invoice{s.account_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge
                    variant={released ? "default" : "secondary"}
                    className={
                      released
                        ? "bg-emerald-600 text-white hover:bg-emerald-600"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                    }
                  >
                    {released ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Released</>
                    ) : (
                      <><Clock className="mr-1 h-3 w-3" /> Held</>
                    )}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold tabular-nums">{fmtExact(s.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Advanced</p>
                    <p className="font-semibold tabular-nums text-primary">{fmtExact(s.advanced_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reserve</p>
                    <p className={`font-semibold tabular-nums ${released ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {fmtExact(s.reserve_amount)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={released ? "outline" : "default"}
                    className="min-h-[36px]"
                    disabled={setReleased.isPending}
                    onClick={() => setReleased.mutate({ id: s.id, released: !released })}
                  >
                    {released ? "Mark as Held" : "Mark Reserve Released"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[36px]"
                    onClick={() => navigate(`/incidents/${s.incident_id}`)}
                  >
                    Open incident
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
