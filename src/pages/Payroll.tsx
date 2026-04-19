import { AppShell } from "@/components/AppShell";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useIncidents } from "@/hooks/useIncidents";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, ChevronLeft, ChevronRight, Clock, DollarSign, Users, Lock } from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface PersonnelEntry {
  operator_name: string;
  date: string;
  total: number | string;
  activity_type?: string;
  lodging?: boolean;
  per_diem_b?: boolean;
  per_diem_l?: boolean;
  per_diem_d?: boolean;
  op_start?: string;
  op_stop?: string;
  sb_start?: string;
  sb_stop?: string;
  remarks?: string;
}

interface ShiftTicketRow {
  id: string;
  incident_truck_id: string;
  personnel_entries: PersonnelEntry[];
  incident_trucks: {
    incident_id: string;
    incidents: { id: string; name: string };
  };
}

function useAllShiftTickets() {
  return useQuery({
    queryKey: ["all-shift-tickets-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tickets")
        .select("id, incident_truck_id, personnel_entries, incident_trucks!inner(incident_id, incidents:incidents!incident_trucks_incident_id_fkey(id, name))");
      if (error) throw error;
      return data as unknown as ShiftTicketRow[];
    },
  });
}

interface CrewPayrollLine {
  crewMemberId: string;
  name: string;
  role: string;
  hourlyRate: number;
  hwRate: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  hwPay: number;
  overtimePay: number;
  grossPay: number;
  lodgingDays: number;
  perDiemDays: number;
}

export default function Payroll() {
  const { isAdmin } = useOrganization();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentFilter, setIncidentFilter] = useState("all");

  const { data: shiftTickets, isLoading: loadingTickets, error: ticketsError } = useAllShiftTickets();
  const { data: crewMembers, isLoading: loadingCrew, error: crewError } = useCrewMembers();
  const { data: incidents } = useIncidents();

  // Pay rates live in an admin-only table; only admins reach this page (AdminGate)
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

  // Build payroll lines from shift ticket personnel entries
  const payrollLines = useMemo((): CrewPayrollLine[] => {
    if (!shiftTickets || !crewMembers) return [];

    // Build name -> crew member lookup (case-insensitive)
    const nameMap = new Map<string, (typeof crewMembers)[number]>();
    crewMembers.forEach((cm) => {
      nameMap.set(cm.name.toLowerCase().trim(), cm);
    });

    // Aggregate hours, lodging, per diem per crew member
    const hoursMap = new Map<string, number>();
    const lodgingMap = new Map<string, Set<string>>();
    const perDiemMap = new Map<string, Set<string>>();

    shiftTickets.forEach((st) => {
      // Incident filter
      if (incidentFilter !== "all") {
        if (st.incident_trucks?.incidents?.id !== incidentFilter) return;
      }

      const entries = Array.isArray(st.personnel_entries) ? st.personnel_entries : [];
      entries.forEach((pe) => {
        if (!pe.operator_name || !pe.date) return;

        // Check if date is within the selected week
        try {
          const d = parseISO(pe.date);
          if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return;
        } catch {
          return;
        }

        const cm = nameMap.get(pe.operator_name.toLowerCase().trim());
        if (!cm) return;

        const hours = Number(pe.total) || 0;
        hoursMap.set(cm.id, (hoursMap.get(cm.id) || 0) + hours);

        // Track lodging days
        if (pe.lodging) {
          if (!lodgingMap.has(cm.id)) lodgingMap.set(cm.id, new Set());
          lodgingMap.get(cm.id)!.add(pe.date);
        }

        // Track per diem days (any meal = per diem day)
        if (pe.per_diem_b || pe.per_diem_l || pe.per_diem_d) {
          if (!perDiemMap.has(cm.id)) perDiemMap.set(cm.id, new Set());
          perDiemMap.get(cm.id)!.add(pe.date);
        }
      });
    });

    const lines: CrewPayrollLine[] = [];
    crewMembers.forEach((cm) => {
      const totalHours = hoursMap.get(cm.id) || 0;
      if (totalHours <= 0) return;

      const comp = compMap.get(cm.id);
      const hourlyRate = Number(comp?.hourly_rate) || 0;
      const hwRate = Number(comp?.hw_rate) || 0;
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);
      const regularPay = regularHours * hourlyRate;
      const hwPay = regularHours * hwRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const grossPay = regularPay + hwPay + overtimePay;

      lines.push({
        crewMemberId: cm.id,
        name: cm.name,
        role: cm.role,
        hourlyRate,
        hwRate,
        totalHours,
        regularHours,
        overtimeHours,
        regularPay,
        hwPay,
        overtimePay,
        grossPay,
        lodgingDays: lodgingMap.get(cm.id)?.size || 0,
        perDiemDays: perDiemMap.get(cm.id)?.size || 0,
      });
    });

    return lines.sort((a, b) => b.grossPay - a.grossPay || b.totalHours - a.totalHours);
  }, [shiftTickets, crewMembers, weekStart, weekEnd, incidentFilter]);

  const totals = useMemo(() => {
    return payrollLines.reduce(
      (acc, l) => ({
        hours: acc.hours + l.totalHours,
        otHours: acc.otHours + l.overtimeHours,
        gross: acc.gross + l.grossPay,
      }),
      { hours: 0, otHours: 0, gross: 0 }
    );
  }, [payrollLines]);

  const prevWeek = () => setWeekStart((w) => subWeeks(w, 1));
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1));

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
        {/* Week selector */}
        <div className="flex items-center justify-between rounded-xl bg-card p-3 card-shadow">
          <button onClick={prevWeek} className="touch-target p-2 rounded-full active:bg-secondary/50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </p>
            <p className="text-[11px] text-muted-foreground">Mon - Sun</p>
          </div>
          <button onClick={nextWeek} className="touch-target p-2 rounded-full active:bg-secondary/50">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Incident filter */}
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

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon={Clock} label="Hours" value={totals.hours.toFixed(1)} />
          <SummaryCard icon={Users} label="OT Hours" value={totals.otHours.toFixed(1)} />
          <SummaryCard icon={DollarSign} label="Gross" value={`$${totals.gross.toFixed(0)}`} />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {!isLoading && loadError && (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm text-destructive">Failed to load payroll data.</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
        )}

        {/* Crew payroll list */}
        {!isLoading && !loadError && (
          <div className="space-y-2">
            {payrollLines.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-muted-foreground">No hours logged this week.</p>
                <p className="text-xs text-muted-foreground">
                  Shift ticket hours will appear here automatically.
                </p>
              </div>
            )}

            {payrollLines.map((line) => (
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
                    <p className="text-[11px] text-muted-foreground">{line.totalHours.toFixed(1)} hrs</p>
                  </div>
                </div>

                {expandedId === line.crewMemberId && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                    <DetailRow label="Base Rate" value={`$${line.hourlyRate.toFixed(2)}/hr`} />
                    <DetailRow label="H&W Rate" value={`$${line.hwRate.toFixed(2)}/hr`} />
                    <DetailRow label="Regular Hours" value={`${line.regularHours.toFixed(1)} hrs`} />
                    <DetailRow label="Regular Pay" value={`$${line.regularPay.toFixed(2)}`} />
                    <DetailRow label="H&W (first 40 hrs)" value={`$${line.hwPay.toFixed(2)}`} />
                    {line.overtimeHours > 0 && (
                      <>
                        <DetailRow label="OT Hours (1.5x)" value={`${line.overtimeHours.toFixed(1)} hrs`} highlight />
                        <DetailRow label="OT Pay" value={`$${line.overtimePay.toFixed(2)}`} highlight />
                      </>
                    )}
                    {line.lodgingDays > 0 && (
                      <DetailRow label="Lodging Days" value={`${line.lodgingDays}`} />
                    )}
                    {line.perDiemDays > 0 && (
                      <DetailRow label="Per Diem Days" value={`${line.perDiemDays}`} />
                    )}
                    <div className="pt-1.5 border-t border-border/40 flex justify-between">
                      <span className="text-xs font-bold">Gross Pay</span>
                      <span className="text-xs font-bold">${line.grossPay.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
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
