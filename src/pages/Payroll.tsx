import { AppShell } from "@/components/AppShell";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useIncidents } from "@/hooks/useIncidents";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Loader2, ChevronLeft, ChevronRight, Clock, DollarSign, Users, Lock, Flame, User,
  FileText, Download, X, Settings as SettingsIcon, AlertTriangle, Printer, CalendarRange,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, subDays, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  aggregateCrewPayroll, pivotByIncident, sumTotals,
  type CrewPayrollLine, type IncidentPayrollLine, type ShiftTicketLite,
  type WithholdingProfile, DEFAULT_ORG_PAYROLL,
} from "@/lib/payroll";
import { useOrgPayrollSettings, useCrewWithholdingProfiles } from "@/hooks/useOrgPayrollSettings";
import { Paystub } from "@/components/payroll/Paystub";
import { generatePaystubPdf } from "@/components/payroll/generatePaystubPdf";
import { PayrollSettingsCard } from "@/components/payroll/PayrollSettingsCard";

interface ShiftTicketRow {
  id: string;
  personnel_entries: any;
  incident_trucks: { incidents: { id: string; name: string } | null } | null;
}

function useAllShiftTickets() {
  return useQuery({
    queryKey: ["all-shift-tickets-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tickets")
        .select("id, personnel_entries, incident_trucks!inner(incidents:incidents!incident_trucks_incident_id_fkey(id, name))");
      if (error) throw error;
      return data as unknown as ShiftTicketRow[];
    },
    // Payroll is read-heavy and aggregates from many sources — always pull fresh
    // on mount so newly-added shift tickets show up immediately, instead of
    // waiting on the global 5-minute stale window from the persisted cache.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

type ViewRange = "week" | "period" | "all";
type ViewMode = "crew" | "fire";

export default function Payroll() {
  const { isAdmin, membership } = useOrganization();
  const orgName = membership?.organizationName ?? "Organization";

  const [viewRange, setViewRange] = useState<ViewRange>("all");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("crew");
  const [showSettings, setShowSettings] = useState(false);
  const [paystubFor, setPaystubFor] = useState<CrewPayrollLine | null>(null);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const [periodEnd, setPeriodEnd] = useState(() => endOfWeek(new Date(), { weekStartsOn: 1 }));
  const periodStart = useMemo(() => startOfWeek(subDays(periodEnd, 7), { weekStartsOn: 1 }), [periodEnd]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentFilter, setIncidentFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");

  const { data: shiftTickets, isLoading: loadingTickets, error: ticketsError } = useAllShiftTickets();
  const { data: crewMembers, isLoading: loadingCrew, error: crewError } = useCrewMembers();
  const { data: incidents } = useIncidents();
  const { data: orgPayroll } = useOrgPayrollSettings();
  const { data: withholdingRows } = useCrewWithholdingProfiles();

  const { data: compensation } = useQuery({
    queryKey: ["crew-compensation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_compensation" as any)
        .select("crew_member_id, hourly_rate, hw_rate, pay_method, daily_rate");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const compMap = useMemo(() => {
    const m = new Map<string, { hourly_rate: number | null; hw_rate: number | null; pay_method?: "hourly" | "daily" | null; daily_rate?: number | null }>();
    (compensation ?? []).forEach((c: any) => m.set(c.crew_member_id, {
      hourly_rate: c.hourly_rate,
      hw_rate: c.hw_rate,
      pay_method: c.pay_method,
      daily_rate: c.daily_rate,
    }));
    return m;
  }, [compensation]);

  const profileMap = useMemo(() => {
    const m = new Map<string, WithholdingProfile>();
    (withholdingRows ?? []).forEach((r: any) => {
      m.set(r.crew_member_id, {
        filing_status: r.filing_status,
        dependents_count: r.dependents_count,
        use_default_withholding: r.use_default_withholding,
        federal_pct_override: r.federal_pct_override,
        extra_withholding: r.extra_withholding,
        state_pct_override: r.state_pct_override,
        social_security_exempt: r.social_security_exempt,
        medicare_exempt: r.medicare_exempt,
        other_deductions: r.other_deductions,
        notes: r.notes,
      });
    });
    return m;
  }, [withholdingRows]);

  const isLoading = loadingTickets || loadingCrew;
  const loadError = ticketsError || crewError;

  const { rangeStart, rangeEnd, rangeLabel, rangeSubLabel } = useMemo(() => {
    if (viewRange === "all") return { rangeStart: null as Date | null, rangeEnd: null as Date | null, rangeLabel: "All Time", rangeSubLabel: "Season to date" };
    if (viewRange === "period") return {
      rangeStart: periodStart, rangeEnd: periodEnd,
      rangeLabel: `${format(periodStart, "MMM d")} - ${format(periodEnd, "MMM d, yyyy")}`,
      rangeSubLabel: "Pay Period (2 weeks)",
    };
    return {
      rangeStart: weekStart, rangeEnd: weekEnd,
      rangeLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
      rangeSubLabel: "Mon - Sun",
    };
  }, [viewRange, weekStart, weekEnd, periodStart, periodEnd]);

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
    const lines = aggregateCrewPayroll({
      shiftTickets: normalizedTickets,
      crewMembers: crewMembers.map((c) => ({ id: c.id, name: c.name, role: c.role })),
      compensation: compMap,
      rangeStart, rangeEnd, incidentFilter,
      withholdings: { profiles: profileMap, orgDefaults: orgPayroll ?? DEFAULT_ORG_PAYROLL },
    });
    if (crewFilter !== "all") return lines.filter((l) => l.crewMemberId === crewFilter);
    return lines;
  }, [normalizedTickets, crewMembers, compMap, rangeStart, rangeEnd, incidentFilter, crewFilter, profileMap, orgPayroll]);

  const incidentLines: IncidentPayrollLine[] = useMemo(() => pivotByIncident(crewLines), [crewLines]);
  const totals = useMemo(() => sumTotals(crewLines), [crewLines]);

  // Active weeks across the current incident/crew filter — derived from raw
  // tickets so it isn't constrained by the rangeStart/rangeEnd cap.
  const crewNameSet = useMemo(() => {
    if (crewFilter === "all") return null;
    const cm = crewMembers?.find((c) => c.id === crewFilter);
    return cm ? cm.name.trim().toLowerCase() : null;
  }, [crewFilter, crewMembers]);

  const activeWeeks = useMemo(() => {
    const buckets = new Map<string, { weekStart: Date; hours: number }>();
    normalizedTickets.forEach((st) => {
      if (incidentFilter !== "all" && st.incident_id !== incidentFilter) return;
      const entries = Array.isArray(st.personnel_entries) ? (st.personnel_entries as any[]) : [];
      entries.forEach((e) => {
        if (!e?.date) return;
        if (crewNameSet && (e.operator_name ?? "").trim().toLowerCase() !== crewNameSet) return;
        const hours = Number(e.total ?? 0);
        if (!hours) return;
        let dt: Date;
        try { dt = parseISO(e.date); } catch { return; }
        if (isNaN(dt.getTime())) return;
        const ws = startOfWeek(dt, { weekStartsOn: 1 });
        const key = ws.toISOString();
        const cur = buckets.get(key) ?? { weekStart: ws, hours: 0 };
        cur.hours += hours;
        buckets.set(key, cur);
      });
    });
    return Array.from(buckets.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [normalizedTickets, incidentFilter, crewNameSet]);

  // Per-incident active weeks (for By Fire chips)
  const activeWeeksByIncident = useMemo(() => {
    const map = new Map<string, { weekStart: Date; hours: number }[]>();
    normalizedTickets.forEach((st) => {
      const entries = Array.isArray(st.personnel_entries) ? (st.personnel_entries as any[]) : [];
      const incKey = st.incident_id ?? "_unassigned";
      entries.forEach((e) => {
        if (!e?.date) return;
        const hours = Number(e.total ?? 0);
        if (!hours) return;
        let dt: Date;
        try { dt = parseISO(e.date); } catch { return; }
        if (isNaN(dt.getTime())) return;
        const ws = startOfWeek(dt, { weekStartsOn: 1 });
        const key = ws.toISOString();
        const list = map.get(incKey) ?? [];
        const existing = list.find((w) => w.weekStart.toISOString() === key);
        if (existing) existing.hours += hours;
        else list.push({ weekStart: ws, hours });
        map.set(incKey, list);
      });
    });
    map.forEach((list) => list.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime()));
    return map;
  }, [normalizedTickets]);

  const jumpToWeek = (date: Date) => {
    setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    setViewRange("week");
    setWeekPickerOpen(false);
  };

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

  const handleDownloadPdf = (line: CrewPayrollLine) => {
    generatePaystubPdf({ line, organizationName: orgName, periodLabel: rangeLabel })
      .catch(() => {/* silent */});
  };

  return (
    <AppShell title="Payroll">
      <div className="p-4 space-y-4">
        {/* Compliance banner */}
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug text-warning-foreground">
            <span className="font-bold">Estimated Withholding</span> — Not Official Tax Calculation.
            For internal operational use only.
          </p>
        </div>

        {/* Settings toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground touch-target px-2 py-1"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            {showSettings ? "Hide" : "Withholding"} Settings
          </button>
        </div>

        {showSettings && <PayrollSettingsCard />}

        {/* Range tabs */}
        <Tabs value={viewRange} onValueChange={(v) => setViewRange(v as ViewRange)}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
            <TabsTrigger value="period" className="text-xs">Pay Period</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewRange !== "all" && (
          <div className="flex items-center justify-between rounded-xl bg-card p-3 card-shadow">
            <button onClick={viewRange === "week" ? prevWeek : prevPeriod} className="touch-target p-2 rounded-full active:bg-secondary/50" aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold">{rangeLabel}</p>
              <p className="text-[11px] text-muted-foreground">{rangeSubLabel}</p>
            </div>
            <button onClick={viewRange === "week" ? nextWeek : nextPeriod} className="touch-target p-2 rounded-full active:bg-secondary/50" aria-label="Next">
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

        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setExpandedId(null); }}>
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="crew" className="text-xs flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> By Crew</TabsTrigger>
            <TabsTrigger value="fire" className="text-xs flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> By Fire</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "crew" && (
          <div className="grid grid-cols-2 gap-2">
            <select value={incidentFilter} onChange={(e) => setIncidentFilter(e.target.value)}
              className="rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target">
              <option value="all">All Incidents</option>
              {incidents?.map((inc) => (<option key={inc.id} value={inc.id}>{inc.name}</option>))}
            </select>
            <select value={crewFilter} onChange={(e) => setCrewFilter(e.target.value)}
              className="rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target">
              <option value="all">All Crew</option>
              {crewMembers?.map((cm) => (<option key={cm.id} value={cm.id}>{cm.name}</option>))}
            </select>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon={Clock} label="Hours" value={totals.hours.toFixed(1)} />
          <SummaryCard icon={Users} label="OT Hours" value={totals.otHours.toFixed(1)} />
          <SummaryCard icon={DollarSign} label="Gross" value={`$${totals.gross.toFixed(0)}`} />
        </div>

        {/* Org-wide totals: deductions + net (always shown) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-destructive/10 p-3 text-center">
            <p className="text-[10px] font-medium text-destructive/80">Total Deductions</p>
            <p className="text-lg font-extrabold text-destructive">−${totals.deductions.toFixed(0)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3 text-center">
            <p className="text-[10px] font-medium text-success/80">Net Pay</p>
            <p className="text-lg font-extrabold text-success">${totals.net.toFixed(0)}</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
        {!isLoading && loadError && (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm text-destructive">Failed to load payroll data.</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
        )}

        {!isLoading && !loadError && viewMode === "crew" && (
          <div className="space-y-2">
            {crewLines.length === 0 && <EmptyState message="No hours logged in this range." />}
            {crewLines.map((line) => (
              <div key={line.crewMemberId} className="rounded-xl bg-card card-shadow overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === line.crewMemberId ? null : line.crewMemberId)}
                  className="w-full text-left p-4 transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{line.name}</p>
                      <p className="text-xs text-muted-foreground">{line.role}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold">${line.grossPay.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {line.payMethod === "daily" && line.shiftCount != null ? (
                          <>{line.shiftCount} {line.shiftCount === 1 ? "shift" : "shifts"} · {line.totalHours.toFixed(1)} hrs</>
                        ) : (
                          <>
                            {line.totalHours.toFixed(1)} hrs
                            {line.overtimeHours > 0 && <span className="text-warning"> · {line.overtimeHours.toFixed(1)} OT</span>}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </button>

                {expandedId === line.crewMemberId && (
                  <div className="border-t border-border/60 p-4 space-y-3">
                    {line.byIncident.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">By Fire</p>
                        {line.byIncident.map((inc) => (
                          <div key={(inc.incidentId ?? "_un") + inc.incidentName} className="flex justify-between items-center pl-1">
                            <span className="text-xs truncate flex-1">{inc.incidentName}</span>
                            <span className="text-[11px] text-muted-foreground mx-2 shrink-0">{inc.totalHours.toFixed(1)} hrs</span>
                            <span className="text-xs font-medium shrink-0 w-20 text-right">${inc.grossPay.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                      {line.payMethod === "daily" && line.dailyRate ? (
                        <>
                          <DetailRow label="Payment Method" value="Flat Daily Rate" />
                          <DetailRow label="Daily Rate" value={`$${line.dailyRate.toFixed(2)}/shift`} />
                          <DetailRow label="Shifts Worked" value={`${line.shiftCount ?? 0}`} />
                          <DetailRow label="Hours Tracked" value={`${line.totalHours.toFixed(1)} hrs`} />
                        </>
                      ) : (
                        <>
                          <DetailRow label="Base Rate" value={`$${line.hourlyRate.toFixed(2)}/hr`} />
                          <DetailRow label="H&W Rate" value={`$${line.hwRate.toFixed(2)}/hr`} />
                          <DetailRow label="Regular Pay" value={`$${line.regularPay.toFixed(2)}`} />
                          <DetailRow label="H&W (first 40 hrs/wk)" value={`$${line.hwPay.toFixed(2)}`} />
                          {line.overtimeHours > 0 && (
                            <DetailRow label={`OT Pay (${line.overtimeHours.toFixed(1)} hrs × 1.5)`} value={`$${line.overtimePay.toFixed(2)}`} highlight />
                          )}
                        </>
                      )}
                      <div className="pt-1.5 border-t border-border/40 flex justify-between">
                        <span className="text-xs font-bold">Gross Pay</span>
                        <span className="text-xs font-bold">${line.grossPay.toFixed(2)}</span>
                      </div>
                    </div>

                    {line.deductions && (
                      <div className="rounded-lg bg-destructive/5 p-3 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-destructive">Deductions</p>
                        <DetailRow label={`Federal (${line.deductions.federalPct.toFixed(2)}%)`} value={`−$${(line.deductions.federal - line.deductions.extraWithholding).toFixed(2)}`} />
                        {line.deductions.extraWithholding > 0 && <DetailRow label="Extra withholding" value={`−$${line.deductions.extraWithholding.toFixed(2)}`} />}
                        <DetailRow label={`Social Security (${line.deductions.ssPct.toFixed(2)}%)`} value={`−$${line.deductions.socialSecurity.toFixed(2)}`} />
                        <DetailRow label={`Medicare (${line.deductions.medicarePct.toFixed(2)}%)`} value={`−$${line.deductions.medicare.toFixed(2)}`} />
                        {line.deductions.statePct > 0 && <DetailRow label={`State (${line.deductions.statePct.toFixed(2)}%)`} value={`−$${line.deductions.state.toFixed(2)}`} />}
                        {line.deductions.other > 0 && <DetailRow label="Other" value={`−$${line.deductions.other.toFixed(2)}`} />}
                        <div className="pt-1.5 border-t border-destructive/20 flex justify-between">
                          <span className="text-xs font-bold text-destructive">Total Deductions</span>
                          <span className="text-xs font-bold text-destructive">−${line.deductions.total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-success/10 p-3 text-center">
                      <p className="text-[10px] font-medium text-success/80">Net Pay</p>
                      <p className="text-2xl font-extrabold text-success">${(line.netPay ?? line.grossPay).toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaystubFor(line)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground active:scale-[0.98] touch-target"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Paystub
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(line)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground active:scale-[0.98] touch-target"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !loadError && viewMode === "fire" && (
          <div className="space-y-2">
            {incidentLines.length === 0 && <EmptyState message="No fire activity in this range." />}
            {incidentLines.map((inc) => {
              const key = inc.incidentId ?? "_unassigned";
              return (
                <button key={key} onClick={() => setExpandedId(expandedId === key ? null : key)}
                  className="w-full text-left rounded-xl bg-card p-4 transition-transform active:scale-[0.98] card-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{inc.incidentName}</p>
                      <p className="text-xs text-muted-foreground">{inc.byCrew.length} {inc.byCrew.length === 1 ? "person" : "people"}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold">${inc.grossPay.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {inc.totalHours.toFixed(1)} hrs
                        {inc.overtimeHours > 0 && <span className="text-warning"> · {inc.overtimeHours.toFixed(1)} OT</span>}
                      </p>
                    </div>
                  </div>
                  {expandedId === key && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
                      {inc.byCrew.map((c) => {
                        const crewLine = crewLines.find((cl) => cl.crewMemberId === c.crewMemberId);
                        const net = crewLine?.netPay ?? c.grossPay;
                        const showNet = !!crewLine?.deductions;
                        return (
                          <div key={c.crewMemberId} className="flex justify-between items-center">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.role}</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground mx-2 shrink-0">{c.totalHours.toFixed(1)} hrs</span>
                            <div className="shrink-0 w-24 text-right">
                              <p className="text-xs font-medium">${c.grossPay.toFixed(2)}</p>
                              {showNet && <p className="text-[10px] text-success">net ${net.toFixed(2)}</p>}
                            </div>
                          </div>
                        );
                      })}
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

      {/* Paystub modal */}
      {paystubFor && (
        <div className="fixed inset-0 z-[60] bg-black/70 overflow-y-auto" onClick={() => setPaystubFor(null)}>
          <div className="min-h-full flex flex-col">
            <div className="sticky top-0 flex items-center justify-between p-3 bg-background border-b shrink-0">
              <button onClick={() => setPaystubFor(null)} className="touch-target p-2"><X className="h-5 w-5" /></button>
              <p className="text-sm font-bold">Paystub</p>
              <div className="flex gap-1">
                <button onClick={() => window.print()} className="touch-target p-2" aria-label="Print"><Printer className="h-5 w-5" /></button>
                <button onClick={() => handleDownloadPdf(paystubFor)} className="touch-target p-2" aria-label="Download PDF"><Download className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex-1 p-3" onClick={(e) => e.stopPropagation()}>
              <Paystub line={paystubFor} organizationName={orgName} periodLabel={rangeLabel} />
            </div>
          </div>
        </div>
      )}
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
      <span className={`text-xs ${highlight ? "text-warning font-medium" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-xs ${highlight ? "text-warning font-medium" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center space-y-2">
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">Shift ticket hours will appear here automatically.</p>
    </div>
  );
}
