import { useState } from "react";
import { ChevronDown, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { IncidentGroup } from "@/hooks/useFactoringDashboard";
import { useSetReserveReleased } from "@/hooks/useFactoringDashboard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export function IncidentFactoringRow({ group }: { group: IncidentGroup }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setReleased = useSetReserveReleased();

  const start = fmtDate(group.incident_start_date);
  const end = fmtDate(group.incident_end_date);
  const dateRange = start && end ? `${start} – ${end}` : start ?? end ?? null;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{group.incident_name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {dateRange && <span>{dateRange}</span>}
            <span>· {group.totals.count} schedule{group.totals.count === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">{fmt(group.totals.submitted)}</p>
          <p className="text-[10px] text-muted-foreground">
            {fmt(group.totals.advanced)} adv
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/60 divide-y divide-border/50">
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
                    <p className="font-semibold tabular-nums">{fmt(s.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Advanced</p>
                    <p className="font-semibold tabular-nums text-primary">{fmt(s.advanced_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reserve</p>
                    <p className={`font-semibold tabular-nums ${released ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {fmt(s.reserve_amount)}
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
