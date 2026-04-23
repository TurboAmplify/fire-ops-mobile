/**
 * Payroll aggregation helpers.
 *
 * Rules:
 * - Week is Monday–Sunday.
 * - Regular hours: up to 40 per Mon–Sun week.
 * - Overtime: anything over 40 in that week, paid at 1.5x base only.
 * - H&W rate paid on regular hours only (first 40), never on OT.
 * - When summing across multiple weeks (Pay Period / All Time), OT is computed
 *   per week then summed — never lumped into one big OT bucket.
 */

import { startOfWeek, parseISO, formatISO } from "date-fns";

export interface PersonnelEntryLite {
  operator_name?: string | null;
  date?: string | null;
  total?: number | string | null;
}

export interface ShiftTicketLite {
  id: string;
  personnel_entries: PersonnelEntryLite[] | unknown;
  incident_id: string | null;
  incident_name: string | null;
}

export interface CrewMemberLite {
  id: string;
  name: string;
  role: string;
}

export interface CompensationLite {
  hourly_rate: number | null;
  hw_rate: number | null;
}

export interface IncidentBreakdown {
  incidentId: string | null;
  incidentName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  hwPay: number;
  overtimePay: number;
  grossPay: number;
}

export interface CrewPayrollLine {
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
  byIncident: IncidentBreakdown[];
}

export interface IncidentPayrollLine {
  incidentId: string | null;
  incidentName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  byCrew: Array<{
    crewMemberId: string;
    name: string;
    role: string;
    totalHours: number;
    grossPay: number;
  }>;
}

export interface PayrollTotals {
  hours: number;
  otHours: number;
  gross: number;
}

interface AggregateOptions {
  shiftTickets: ShiftTicketLite[];
  crewMembers: CrewMemberLite[];
  compensation: Map<string, CompensationLite>;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  incidentFilter: string;
}

interface WeekBucket {
  hours: number;
  byIncident: Map<string, { hours: number; incidentName: string }>;
}

function withinRange(dateStr: string, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;
  let d: Date;
  try {
    d = parseISO(dateStr);
  } catch {
    return false;
  }
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

function weekKey(dateStr: string): string {
  const d = parseISO(dateStr);
  return formatISO(startOfWeek(d, { weekStartsOn: 1 }), { representation: "date" });
}

/**
 * Aggregate personnel entries into per-crew payroll lines.
 * OT is computed per Mon–Sun week so multi-week ranges sum correctly.
 */
export function aggregateCrewPayroll(opts: AggregateOptions): CrewPayrollLine[] {
  const { shiftTickets, crewMembers, compensation, rangeStart, rangeEnd, incidentFilter } = opts;

  // name -> crew
  const nameMap = new Map<string, CrewMemberLite>();
  crewMembers.forEach((cm) => nameMap.set(cm.name.toLowerCase().trim(), cm));

  // crewId -> weekKey -> WeekBucket
  const buckets = new Map<string, Map<string, WeekBucket>>();

  shiftTickets.forEach((st) => {
    if (incidentFilter !== "all" && st.incident_id !== incidentFilter) return;
    const entries = Array.isArray(st.personnel_entries) ? st.personnel_entries : [];
    const incidentId = st.incident_id ?? "_unassigned";
    const incidentName = st.incident_name ?? "Unassigned";

    (entries as PersonnelEntryLite[]).forEach((pe) => {
      if (!pe.operator_name || !pe.date) return;
      if (!withinRange(pe.date, rangeStart, rangeEnd)) return;
      const cm = nameMap.get(pe.operator_name.toLowerCase().trim());
      if (!cm) return;
      const hours = Number(pe.total) || 0;
      if (hours <= 0) return;

      let wkMap = buckets.get(cm.id);
      if (!wkMap) {
        wkMap = new Map();
        buckets.set(cm.id, wkMap);
      }
      const wk = weekKey(pe.date);
      let bucket = wkMap.get(wk);
      if (!bucket) {
        bucket = { hours: 0, byIncident: new Map() };
        wkMap.set(wk, bucket);
      }
      bucket.hours += hours;
      const inc = bucket.byIncident.get(incidentId);
      if (inc) {
        inc.hours += hours;
      } else {
        bucket.byIncident.set(incidentId, { hours, incidentName });
      }
    });
  });

  const lines: CrewPayrollLine[] = [];

  crewMembers.forEach((cm) => {
    const wkMap = buckets.get(cm.id);
    if (!wkMap || wkMap.size === 0) return;

    const comp = compensation.get(cm.id);
    const hourlyRate = Number(comp?.hourly_rate) || 0;
    const hwRate = Number(comp?.hw_rate) || 0;

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let hwPay = 0;
    let overtimePay = 0;

    // incidentId -> aggregate breakdown across all weeks
    const incAgg = new Map<
      string,
      { incidentName: string; totalHours: number; regularHours: number; overtimeHours: number }
    >();

    wkMap.forEach((bucket) => {
      const wkTotal = bucket.hours;
      const wkReg = Math.min(wkTotal, 40);
      const wkOT = Math.max(0, wkTotal - 40);

      totalHours += wkTotal;
      regularHours += wkReg;
      overtimeHours += wkOT;
      regularPay += wkReg * hourlyRate;
      hwPay += wkReg * hwRate;
      overtimePay += wkOT * hourlyRate * 1.5;

      // Distribute the week's reg/OT across incidents proportionally to that
      // week's hours per incident. This keeps per-incident totals consistent
      // with weekly OT calculation (no incident gets "free" OT).
      bucket.byIncident.forEach((inc, incidentId) => {
        const share = wkTotal > 0 ? inc.hours / wkTotal : 0;
        const incReg = wkReg * share;
        const incOT = wkOT * share;
        const existing = incAgg.get(incidentId);
        if (existing) {
          existing.totalHours += inc.hours;
          existing.regularHours += incReg;
          existing.overtimeHours += incOT;
        } else {
          incAgg.set(incidentId, {
            incidentName: inc.incidentName,
            totalHours: inc.hours,
            regularHours: incReg,
            overtimeHours: incOT,
          });
        }
      });
    });

    const byIncident: IncidentBreakdown[] = [];
    incAgg.forEach((agg, incidentId) => {
      const incRegPay = agg.regularHours * hourlyRate;
      const incHwPay = agg.regularHours * hwRate;
      const incOTPay = agg.overtimeHours * hourlyRate * 1.5;
      byIncident.push({
        incidentId: incidentId === "_unassigned" ? null : incidentId,
        incidentName: agg.incidentName,
        totalHours: agg.totalHours,
        regularHours: agg.regularHours,
        overtimeHours: agg.overtimeHours,
        regularPay: incRegPay,
        hwPay: incHwPay,
        overtimePay: incOTPay,
        grossPay: incRegPay + incHwPay + incOTPay,
      });
    });
    byIncident.sort((a, b) => b.grossPay - a.grossPay);

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
      grossPay: regularPay + hwPay + overtimePay,
      byIncident,
    });
  });

  return lines.sort((a, b) => b.grossPay - a.grossPay || b.totalHours - a.totalHours);
}

/**
 * Re-pivot crew lines into per-incident lines.
 */
export function pivotByIncident(crewLines: CrewPayrollLine[]): IncidentPayrollLine[] {
  const map = new Map<string, IncidentPayrollLine>();
  crewLines.forEach((line) => {
    line.byIncident.forEach((inc) => {
      const key = inc.incidentId ?? "_unassigned";
      let entry = map.get(key);
      if (!entry) {
        entry = {
          incidentId: inc.incidentId,
          incidentName: inc.incidentName,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          grossPay: 0,
          byCrew: [],
        };
        map.set(key, entry);
      }
      entry.totalHours += inc.totalHours;
      entry.regularHours += inc.regularHours;
      entry.overtimeHours += inc.overtimeHours;
      entry.grossPay += inc.grossPay;
      entry.byCrew.push({
        crewMemberId: line.crewMemberId,
        name: line.name,
        role: line.role,
        totalHours: inc.totalHours,
        grossPay: inc.grossPay,
      });
    });
  });

  const out = Array.from(map.values());
  out.forEach((inc) => inc.byCrew.sort((a, b) => b.grossPay - a.grossPay));
  return out.sort((a, b) => b.grossPay - a.grossPay);
}

export function sumTotals(lines: CrewPayrollLine[]): PayrollTotals {
  return lines.reduce(
    (acc, l) => ({
      hours: acc.hours + l.totalHours,
      otHours: acc.otHours + l.overtimeHours,
      gross: acc.gross + l.grossPay,
    }),
    { hours: 0, otHours: 0, gross: 0 }
  );
}
