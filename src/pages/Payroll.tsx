import { AppShell } from "@/components/AppShell";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useAllShifts } from "@/hooks/useShifts";
import { useIncidents } from "@/hooks/useIncidents";
import { Loader2, ChevronLeft, ChevronRight, Clock, DollarSign, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isWithinInterval } from "date-fns";
import type { ShiftWithRelations } from "@/services/shifts";
import type { CrewMember } from "@/services/crew";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ShiftCrewWithMember {
  id: string;
  shift_id: string;
  crew_member_id: string;
  hours: number;
  role_on_shift: string | null;
  crew_members: CrewMember & { hourly_rate?: number | null; hw_rate?: number | null };
}

function useAllShiftCrew() {
  return useQuery({
    queryKey: ["all-shift-crew"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_crew")
        .select("id, shift_id, crew_member_id, hours, role_on_shift, crew_members(*)");
      if (error) throw error;
      return data as unknown as ShiftCrewWithMember[];
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
}

export default function Payroll() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentFilter, setIncidentFilter] = useState("all");

  const { data: shifts, isLoading: loadingShifts } = useAllShifts();
  const { data: shiftCrew, isLoading: loadingCrew } = useAllShiftCrew();
  const { data: crewMembers } = useCrewMembers();
  const { data: incidents } = useIncidents();

  const isLoading = loadingShifts || loadingCrew;

  // Filter shifts to current week and optional incident
  const weekShiftIds = useMemo(() => {
    if (!shifts) return new Set<string>();
    return new Set(
      shifts
        .filter((s) => {
          try {
            const d = parseISO(s.date);
            const inWeek = isWithinInterval(d, { start: weekStart, end: weekEnd });
            if (!inWeek) return false;
            if (incidentFilter !== "all") {
              return s.incident_trucks?.incidents?.id === incidentFilter;
            }
            return true;
          } catch {
            return false;
          }
        })
        .map((s) => s.id)
    );
  }, [shifts, weekStart, weekEnd, incidentFilter]);

  // Build payroll lines per crew member
  const payrollLines = useMemo((): CrewPayrollLine[] => {
    if (!shiftCrew || !crewMembers) return [];

    const hoursMap = new Map<string, number>();
    shiftCrew.forEach((sc) => {
      if (!weekShiftIds.has(sc.shift_id)) return;
      hoursMap.set(sc.crew_member_id, (hoursMap.get(sc.crew_member_id) || 0) + Number(sc.hours));
    });

    const lines: CrewPayrollLine[] = [];
    crewMembers.forEach((cm: any) => {
      const totalHours = hoursMap.get(cm.id) || 0;
      if (totalHours <= 0) return;

      const hourlyRate = Number(cm.hourly_rate) || 0;
      const hwRate = Number(cm.hw_rate) || 0;
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
      });
    });

    return lines.sort((a, b) => b.grossPay - a.grossPay);
  }, [shiftCrew, crewMembers, weekShiftIds]);

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

        {/* Crew payroll list */}
        {!isLoading && (
          <div className="space-y-2">
            {payrollLines.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-muted-foreground">No hours logged this week.</p>
                <p className="text-xs text-muted-foreground">
                  Shift crew hours will appear here automatically.
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
                    <DetailRow
                      label="Regular Pay"
                      value={`$${line.regularPay.toFixed(2)}`}
                    />
                    <DetailRow
                      label="H&W (first 40 hrs)"
                      value={`$${line.hwPay.toFixed(2)}`}
                    />
                    {line.overtimeHours > 0 && (
                      <>
                        <DetailRow
                          label="OT Hours (1.5x)"
                          value={`${line.overtimeHours.toFixed(1)} hrs`}
                          highlight
                        />
                        <DetailRow
                          label="OT Pay"
                          value={`$${line.overtimePay.toFixed(2)}`}
                          highlight
                        />
                      </>
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
