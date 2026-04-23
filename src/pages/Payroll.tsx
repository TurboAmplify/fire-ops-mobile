import { AppShell } from "@/components/AppShell";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useIncidents } from "@/hooks/useIncidents";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Users,
  Lock,
  Flame,
  User,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  subDays,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  aggregateCrewPayroll,
  pivotByIncident,
  sumTotals,
  type CrewPayrollLine,
  type IncidentPayrollLine,
  type ShiftTicketLite,
} from "@/lib/payroll";

interface ShiftTicketRow {
  id: string;
  personnel_entries: any;
  incident_trucks: {
    incidents: { id: string; name: string } | null;
  } | null;
}

function useAllShiftTickets() {
  return useQuery({
    queryKey: ["all-shift-tickets-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tickets")
        .select(
          "id, personnel_entries, incident_trucks!inner(incidents:incidents!incident_trucks_incident_id_fkey(id, name))"
        );
      if (error) throw error;
      return data as unknown as ShiftTicketRow[];
    },
  });
}

type ViewRange = "week" | "period" | "all";
type ViewMode = "crew" | "fire";

export default function Payroll() {
  const { isAdmin } = useOrganization();

  const [viewRange, setViewRange] = useState<ViewRange>("week");
  const [viewMode, setViewMode] = useState<ViewMode>("crew");

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Pay period: defaults to current 2-week pay period (this week + last week)
  const [periodEnd, setPeriodEnd] = useState(() =>
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const periodStart = useMemo(
    () => startOfWeek(subDays(periodEnd, 7), { weekStartsOn: 1 }),
    [periodEnd]
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentFilter, setIncidentFilter] = useState("all");

  const { data: shiftTickets, isLoading: loadingTickets, error: ticketsError } = useAllShiftTickets();
  const { data: crewMembers, isLoading: loadingCrew, error: crewError } = useCrewMembers();
  const { data: incidents } = useIncidents();

  const { data: compensation } = useQuery({
    queryKey: ["crew-compensation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_compensation" as any)
        .select("crew_member_id, hourly_rate, hw_rate");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: isAdmin,
  });

  const compMap = useMemo(() => {
    const m = new Map<string, { hourly_rate: number | null; hw_rate: number | null }>();
    (compensation ?? []).forEach((c: any) => {
      m.set(c.crew_member_id, { hourly_rate: c.hourly_rate, hw_rate: c.hw_rate });
    });
    return m;
  }, [compensation]);

  const isLoading = loadingTickets || loadingCrew;
  const loadError = ticketsError || crewError;

  const { rangeStart, rangeEnd, rangeLabel, rangeSubLabel } = useMemo(() => {
    if (viewRange === "all") {
      return {
        rangeStart: null as Date | null,
        rangeEnd: null as Date | null,
        rangeLabel: "All Time",
        rangeSubLabel: "Season to date",
      };
    }
    if (viewRange === "period") {
      return {
        rangeStart: periodStart,
        rangeEnd: periodEnd,
        rangeLabel: `${format(periodStart, "MMM d")} - ${format(periodEnd, "MMM d, yyyy")}`,
        rangeSubLabel: "Pay Period (2 weeks)",
      };
    }
    return {
      rangeStart: weekStart,
      rangeEnd: weekEnd,
      rangeLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
      rangeSubLabel: "Mon - Sun",
    };
  }, [viewRange, weekStart, weekEnd, periodStart, periodEnd]);

  // Normalize tickets for the aggregator
  const normalizedTickets: ShiftTicketLite[] = useMemo(() => {
    if (!shiftTickets) return [];
    return shiftTickets.map((st) => ({
      id: st.id,
      personnel_entries: st.personnel_entries,
      incident_id: st.incident_trucks?.incidents?.id ?? null,
      incident_name: st.incident_trucks?.incidents?.name ?? "Unassigned",
    }));
  }, [shiftTickets]);

  const crewLines: CrewPayrollLine[] = useMemo(() => {
    if (!crewMembers) return [];
    return aggregateCrewPayroll({
      shiftTickets: normalizedTickets,
      crewMembers: crewMembers.map((c) => ({ id: c.id, name: c.name, role: c.role })),
      compensation: compMap,
      rangeStart,
      rangeEnd,
      incidentFilter,
    });
  }, [normalizedTickets, crewMembers, compMap, rangeStart, rangeEnd, incidentFilter]);

  const incidentLines: IncidentPayrollLine[] = useMemo(
    () => pivotByIncident(crewLines),
    [crewLines]
  );

  const totals = useMemo(() => sumTotals(crewLines), [crewLines]);

  const prevWeek = () => setWeekStart((w) => subWeeks(w, 1));
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1));
  const prevPeriod = () => setPeriodEnd((d) => subWeeks(d, 2));
  const nextPeriod = () => setPeriodEnd((d) => addWeeks(d, 2));

  if (!isAdmin) {
    return (
      <AppShell title="Payroll">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold">Admin only</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Payroll is restricted to organization admins. Contact your admin if you need access.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Payroll">
      <div className="p-4 space-y-4">
        {/* Range tabs */}
        <Tabs value={viewRange} onValueChange={(v) => setViewRange(v as ViewRange)}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
            <TabsTrigger value="period" className="text-xs">Pay Period</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Range selector — week / period only */}
        {viewRange !== "all" && (
          <div className="flex items-center justify-between rounded-xl bg-card p-3 card-shadow">
            <button
              onClick={viewRange === "week" ? prevWeek : prevPeriod}
              className="touch-target p-2 rounded-full active:bg-secondary/50"
              aria-label="Previous range"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold">{rangeLabel}</p>
              <p className="text-[11px] text-muted-foreground">{rangeSubLabel}</p>
            </div>
            <button
              onClick={viewRange === "week" ? nextWeek : nextPeriod}
              className="touch-target p-2 rounded-full active:bg-secondary/50"
              aria-label="Next range"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {viewRange === "all" && (
          <div className="rounded-xl bg-card p-3 card-shadow text-center">
            <p className="text-sm font-bold">{rangeLabel}</p>
            <p className="text-[11px] text-muted-foreground">{rangeSubLabel}</p>
          </div>
        )}

        {/* Mode toggle: By Crew / By Fire */}
        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setExpandedId(null); }}>
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="crew" className="text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> By Crew
            </TabsTrigger>
            <TabsTrigger value="fire" className="text-xs flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" /> By Fire
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Incident filter — only useful in By Crew mode */}
        {viewMode === "crew" && (
          <select
            value={incidentFilter}
            onChange={(e) => setIncidentFilter(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
          >
            <option value="all">All Incidents</option>
            {incidents?.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.name}</option>
            ))}
          </select>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon={Clock} label="Hours" value={totals.hours.toFixed(1)} />
          <SummaryCard icon={Users} label="OT Hours" value={totals.otHours.toFixed(1)} />
          <SummaryCard icon={DollarSign} label="Gross" value={`$${totals.gross.toFixed(0)}`} />
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && loadError && (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm text-destructive">Failed to load payroll data.</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
        )}

        {/* By Crew list */}
        {!isLoading && !loadError && viewMode === "crew" && (
          <div className="space-y-2">
            {crewLines.length === 0 && (
              <EmptyState message="No hours logged in this range." />
            )}

            {crewLines.map((line) => (
              <button
                key={line.crewMemberId}
                onClick={() => setExpandedId(expandedId === line.crewMemberId ? null : line.crewMemberId)}
                className="w-full text-left rounded-xl bg-card p-4 transition-transform active:scale-[0.98] card-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{line.name}</p>
                    <p className="text-xs text-muted-foreground">{line.role}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold">${line.grossPay.toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {line.totalHours.toFixed(1)} hrs
                      {line.overtimeHours > 0 && (
                        <span className="text-warning"> · {line.overtimeHours.toFixed(1)} OT</span>
                      )}
                    </p>
                  </div>
                </div>

                {expandedId === line.crewMemberId && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                    {/* Per-incident breakdown */}
                    {line.byIncident.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">By Fire</p>
                        {line.byIncident.map((inc) => (
                          <div key={(inc.incidentId ?? "_un") + inc.incidentName} className="flex justify-between items-center pl-1">
                            <span className="text-xs truncate flex-1">{inc.incidentName}</span>
                            <span className="text-[11px] text-muted-foreground mx-2 shrink-0">
                              {inc.totalHours.toFixed(1)} hrs
                            </span>
                            <span className="text-xs font-medium shrink-0 w-20 text-right">
                              ${inc.grossPay.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                      <DetailRow label="Base Rate" value={`$${line.hourlyRate.toFixed(2)}/hr`} />
                      <DetailRow label="H&W Rate" value={`$${line.hwRate.toFixed(2)}/hr`} />
                      <DetailRow label="Regular Hours" value={`${line.regularHours.toFixed(1)} hrs`} />
                      <DetailRow label="Regular Pay" value={`$${line.regularPay.toFixed(2)}`} />
                      <DetailRow label="H&W (first 40 hrs/wk)" value={`$${line.hwPay.toFixed(2)}`} />
                      {line.overtimeHours > 0 && (
                        <>
                          <DetailRow label="OT Hours (1.5x)" value={`${line.overtimeHours.toFixed(1)} hrs`} highlight />
                          <DetailRow label="OT Pay" value={`$${line.overtimePay.toFixed(2)}`} highlight />
                        </>
                      )}
                      <div className="pt-1.5 border-t border-border/40 flex justify-between">
                        <span className="text-xs font-bold">Gross Pay</span>
                        <span className="text-xs font-bold">${line.grossPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* By Fire list */}
        {!isLoading && !loadError && viewMode === "fire" && (
          <div className="space-y-2">
            {incidentLines.length === 0 && (
              <EmptyState message="No fire activity in this range." />
            )}

            {incidentLines.map((inc) => {
              const key = inc.incidentId ?? "_unassigned";
              return (
                <button
                  key={key}
                  onClick={() => setExpandedId(expandedId === key ? null : key)}
                  className="w-full text-left rounded-xl bg-card p-4 transition-transform active:scale-[0.98] card-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{inc.incidentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {inc.byCrew.length} {inc.byCrew.length === 1 ? "person" : "people"}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold">${inc.grossPay.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {inc.totalHours.toFixed(1)} hrs
                        {inc.overtimeHours > 0 && (
                          <span className="text-warning"> · {inc.overtimeHours.toFixed(1)} OT</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {expandedId === key && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
                      {inc.byCrew.map((c) => (
                        <div key={c.crewMemberId} className="flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.role}</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground mx-2 shrink-0">
                            {c.totalHours.toFixed(1)} hrs
                          </span>
                          <span className="text-xs font-medium shrink-0 w-20 text-right">
                            ${c.grossPay.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border/40 flex justify-between">
                        <span className="text-xs font-bold">Fire Total</span>
                        <span className="text-xs font-bold">${inc.grossPay.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary/10 p-3 text-center">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-extrabold text-primary">{value}</p>
      <p className="text-[10px] text-primary/70 font-medium">{label}</p>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-xs ${highlight ? "text-warning font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-xs ${highlight ? "text-warning font-medium" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center space-y-2">
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">
        Shift ticket hours will appear here automatically.
      </p>
    </div>
  );
}
