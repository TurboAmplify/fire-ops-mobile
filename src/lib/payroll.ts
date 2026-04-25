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
  pay_method?: "hourly" | "daily" | null;
  daily_rate?: number | null;
}

// === Withholding profile / org defaults =====================================

export interface OrgPayrollDefaults {
  federal_pct: number;        // e.g. 10
  social_security_pct: number; // 6.2
  medicare_pct: number;        // 1.45
  state_pct: number;           // 0
  state_enabled: boolean;
  extra_withholding_default: number; // dollars
  workers_comp_pct: number;    // employer-side workers comp insurance %
}

export const DEFAULT_ORG_PAYROLL: OrgPayrollDefaults = {
  federal_pct: 10,
  social_security_pct: 6.2,
  medicare_pct: 1.45,
  state_pct: 0,
  state_enabled: false,
  extra_withholding_default: 0,
  workers_comp_pct: 0,
};

export interface WithholdingProfile {
  filing_status?: "single" | "married_jointly" | null;
  dependents_count?: number | null;
  use_default_withholding?: boolean | null;
  federal_pct_override?: number | null;
  extra_withholding?: number | null;
  state_pct_override?: number | null;
  social_security_exempt?: boolean | null;
  medicare_exempt?: boolean | null;
  other_deductions?: number | null;
  notes?: string | null;
}

export interface DeductionBreakdown {
  federalPct: number;
  federal: number;
  ssPct: number;
  socialSecurity: number;
  medicarePct: number;
  medicare: number;
  statePct: number;
  state: number;
  extraWithholding: number;
  other: number;
  total: number;
}

export interface CalcDeductionsInput {
  grossPay: number;
  profile?: WithholdingProfile | null;
  orgDefaults: OrgPayrollDefaults;
}

/**
 * Simplified percentage-based withholding. Not an official tax calculation.
 * - SS / Medicare apply to gross pay unless the employee is exempt.
 * - Federal % resolves: profile override (when use_default is false) → org default.
 * - Extra withholding is a flat dollar add on top of federal.
 * - State % resolves: profile override → org default (only when state enabled).
 */
export function calcDeductions({ grossPay, profile, orgDefaults }: CalcDeductionsInput): DeductionBreakdown {
  const useDefault = profile?.use_default_withholding ?? true;

  const federalPct = !useDefault && profile?.federal_pct_override != null
    ? Number(profile.federal_pct_override)
    : Number(orgDefaults.federal_pct);

  const ssPct = profile?.social_security_exempt ? 0 : Number(orgDefaults.social_security_pct);
  const medicarePct = profile?.medicare_exempt ? 0 : Number(orgDefaults.medicare_pct);

  let statePct = 0;
  if (orgDefaults.state_enabled) {
    statePct = !useDefault && profile?.state_pct_override != null
      ? Number(profile.state_pct_override)
      : Number(orgDefaults.state_pct);
  }

  const extraWithholding = profile?.extra_withholding != null
    ? Number(profile.extra_withholding)
    : Number(orgDefaults.extra_withholding_default ?? 0);

  const other = Number(profile?.other_deductions ?? 0);

  const federal = (grossPay * federalPct) / 100 + extraWithholding;
  const socialSecurity = (grossPay * ssPct) / 100;
  const medicare = (grossPay * medicarePct) / 100;
  const state = (grossPay * statePct) / 100;

  const total = federal + socialSecurity + medicare + state + other;

  return {
    federalPct,
    federal,
    ssPct,
    socialSecurity,
    medicarePct,
    medicare,
    statePct,
    state,
    extraWithholding,
    other,
    total,
  };
}

/**
 * Employer-side FICA match. Mirrors the employee SS/Medicare rates from
 * org defaults, respecting per-employee exemptions. This is the contractor's
 * cost on top of gross wages — not withheld from the employee.
 *
 * Note: FUTA/SUTA are intentionally omitted (would require YTD wage tracking
 * to be accurate). Org admins can add a flat "other" employer overhead later
 * if needed.
 */
export function calcEmployerCosts({ grossPay, profile, orgDefaults }: CalcDeductionsInput): EmployerCosts {
  const ssPct = profile?.social_security_exempt ? 0 : Number(orgDefaults.social_security_pct);
  const medicarePct = profile?.medicare_exempt ? 0 : Number(orgDefaults.medicare_pct);
  const wcPct = Number(orgDefaults.workers_comp_pct ?? 0);
  const socialSecurity = (grossPay * ssPct) / 100;
  const medicare = (grossPay * medicarePct) / 100;
  const workersComp = (grossPay * wcPct) / 100;
  const total = socialSecurity + medicare + workersComp;
  return {
    ssPct,
    socialSecurity,
    medicarePct,
    medicare,
    workersCompPct: wcPct,
    workersComp,
    total,
    trueCost: grossPay + total,
  };
}

// === Aggregation ============================================================

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

export interface PayrollAdjustmentLite {
  id: string;
  crew_member_id: string;
  incident_id: string | null;
  adjustment_date: string;
  adjustment_type: "hours" | "flat";
  hours: number | null;
  amount: number | null;
  reason: string;
}

export interface AdjustmentLine {
  id: string;
  date: string;
  incidentId: string | null;
  type: "hours" | "flat";
  hours: number | null;
  amount: number;
  reason: string;
}

export interface EmployerCosts {
  ssPct: number;
  socialSecurity: number;
  medicarePct: number;
  medicare: number;
  workersCompPct: number;
  workersComp: number;
  total: number;          // FICA match + workers comp (employer share)
  trueCost: number;       // grossPay + employer total (full burdened labor cost)
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
  // Payment method
  payMethod?: "hourly" | "daily";
  dailyRate?: number;
  shiftCount?: number;
  shiftDates?: string[];
  // Adjustments (admin-added bonus pay, paid at base rate, no OT/H&W)
  adjustments: AdjustmentLine[];
  adjustmentTotal: number;
  // Withholding (optional — only populated when withholdings provided)
  deductions?: DeductionBreakdown;
  netPay?: number;
  // Employer-side FICA match (only populated when withholdings provided)
  employer?: EmployerCosts;
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
  deductions: number;
  net: number;
}

interface AggregateOptions {
  shiftTickets: ShiftTicketLite[];
  crewMembers: CrewMemberLite[];
  compensation: Map<string, CompensationLite>;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  incidentFilter: string | string[];
  // Optional payroll adjustments (admin-added bonus pay)
  adjustments?: PayrollAdjustmentLite[];
  // Optional incident name lookup so adjustments can show fire names
  incidentNames?: Map<string, string>;
  // Optional withholding context. When provided, each line gets deductions+netPay.
  withholdings?: {
    profiles: Map<string, WithholdingProfile>;
    orgDefaults: OrgPayrollDefaults;
  };
}

interface WeekBucket {
  hours: number;
  byIncident: Map<string, { hours: number; incidentName: string; dates: Set<string> }>;
  dates: Set<string>;
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
  const {
    shiftTickets, crewMembers, compensation, rangeStart, rangeEnd,
    incidentFilter, withholdings, adjustments, incidentNames,
  } = opts;

  const nameMap = new Map<string, CrewMemberLite>();
  crewMembers.forEach((cm) => nameMap.set(cm.name.toLowerCase().trim(), cm));

  // Normalize incident filter: "all" / [] => no filter; otherwise a Set of allowed incident ids
  const allowedIncidents: Set<string> | null = (() => {
    if (incidentFilter === "all") return null;
    if (Array.isArray(incidentFilter)) {
      if (incidentFilter.length === 0) return null;
      return new Set(incidentFilter);
    }
    return new Set([incidentFilter]);
  })();
  const matchesIncident = (id: string | null | undefined) =>
    allowedIncidents === null ? true : !!id && allowedIncidents.has(id);

  // Index adjustments by crew member, filtered by current range + incident
  const adjByCrew = new Map<string, PayrollAdjustmentLite[]>();
  (adjustments ?? []).forEach((adj) => {
    if (!withinRange(adj.adjustment_date, rangeStart, rangeEnd)) return;
    if (allowedIncidents !== null && !matchesIncident(adj.incident_id)) return;
    const list = adjByCrew.get(adj.crew_member_id) ?? [];
    list.push(adj);
    adjByCrew.set(adj.crew_member_id, list);
  });

  const buckets = new Map<string, Map<string, WeekBucket>>();

  shiftTickets.forEach((st) => {
    if (!matchesIncident(st.incident_id)) return;
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
        bucket = { hours: 0, byIncident: new Map(), dates: new Set() };
        wkMap.set(wk, bucket);
      }
      bucket.hours += hours;
      bucket.dates.add(pe.date);
      const inc = bucket.byIncident.get(incidentId);
      if (inc) {
        inc.hours += hours;
        inc.dates.add(pe.date);
      } else {
        bucket.byIncident.set(incidentId, { hours, incidentName, dates: new Set([pe.date]) });
      }
    });
  });

  const lines: CrewPayrollLine[] = [];

  // Build the set of crew to render: any with shift hours OR any with adjustments
  const crewIdsToProcess = new Set<string>();
  buckets.forEach((_, id) => crewIdsToProcess.add(id));
  adjByCrew.forEach((_, id) => crewIdsToProcess.add(id));

  crewMembers.forEach((cm) => {
    if (!crewIdsToProcess.has(cm.id)) return;
    const wkMap = buckets.get(cm.id);
    const crewAdjustments = adjByCrew.get(cm.id) ?? [];

    const comp = compensation.get(cm.id);
    const hourlyRate = Number(comp?.hourly_rate) || 0;
    const hwRate = Number(comp?.hw_rate) || 0;
    const payMethod: "hourly" | "daily" = comp?.pay_method === "daily" ? "daily" : "hourly";
    const dailyRate = Number(comp?.daily_rate) || 0;

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let hwPay = 0;
    let overtimePay = 0;

    // Daily-only: collect distinct shift dates (overall + per incident)
    const allDates = new Set<string>();
    const incAgg = new Map<
      string,
      { incidentName: string; totalHours: number; regularHours: number; overtimeHours: number; dates: Set<string> }
    >();

    if (wkMap) {
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

        bucket.dates.forEach((d) => allDates.add(d));

        bucket.byIncident.forEach((inc, incidentId) => {
          const share = wkTotal > 0 ? inc.hours / wkTotal : 0;
          const incReg = wkReg * share;
          const incOT = wkOT * share;
          const existing = incAgg.get(incidentId);
          if (existing) {
            existing.totalHours += inc.hours;
            existing.regularHours += incReg;
            existing.overtimeHours += incOT;
            inc.dates.forEach((d) => existing.dates.add(d));
          } else {
            incAgg.set(incidentId, {
              incidentName: inc.incidentName,
              totalHours: inc.hours,
              regularHours: incReg,
              overtimeHours: incOT,
              dates: new Set(inc.dates),
            });
          }
        });
      });
    }

    const isDaily = payMethod === "daily" && dailyRate > 0;
    const shiftCount = allDates.size;
    const sortedShiftDates = Array.from(allDates).sort();

    const byIncident: IncidentBreakdown[] = [];
    incAgg.forEach((agg, incidentId) => {
      let incRegPay: number;
      let incHwPay: number;
      let incOTPay: number;
      let incGross: number;
      if (isDaily) {
        incRegPay = 0;
        incHwPay = 0;
        incOTPay = 0;
        incGross = agg.dates.size * dailyRate;
      } else {
        incRegPay = agg.regularHours * hourlyRate;
        incHwPay = agg.regularHours * hwRate;
        incOTPay = agg.overtimeHours * hourlyRate * 1.5;
        incGross = incRegPay + incHwPay + incOTPay;
      }
      byIncident.push({
        incidentId: incidentId === "_unassigned" ? null : incidentId,
        incidentName: agg.incidentName,
        totalHours: agg.totalHours,
        regularHours: agg.regularHours,
        overtimeHours: agg.overtimeHours,
        regularPay: incRegPay,
        hwPay: incHwPay,
        overtimePay: incOTPay,
        grossPay: incGross,
      });
    });
    byIncident.sort((a, b) => b.grossPay - a.grossPay);

    let grossPay: number;
    if (isDaily) {
      // Flat daily — ignore hourly breakdown for pay calculation
      grossPay = shiftCount * dailyRate;
      regularPay = 0;
      hwPay = 0;
      overtimePay = 0;
      // Keep hours for display, but zero out OT (no OT on daily)
      overtimeHours = 0;
      regularHours = totalHours;
    } else {
      grossPay = regularPay + hwPay + overtimePay;
    }

    // Resolve adjustments: hours×base rate or flat amount; always at base, no OT/H&W
    const adjustmentLines: AdjustmentLine[] = crewAdjustments.map((a) => {
      const amount = a.adjustment_type === "hours"
        ? Number(a.hours ?? 0) * hourlyRate
        : Number(a.amount ?? 0);
      return {
        id: a.id,
        date: a.adjustment_date,
        incidentId: a.incident_id,
        type: a.adjustment_type,
        hours: a.adjustment_type === "hours" ? Number(a.hours ?? 0) : null,
        amount,
        reason: a.reason,
      };
    });
    const adjustmentTotal = adjustmentLines.reduce((s, a) => s + a.amount, 0);
    grossPay += adjustmentTotal;

    const line: CrewPayrollLine = {
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
      byIncident,
      payMethod,
      adjustments: adjustmentLines,
      adjustmentTotal,
    };

    if (isDaily) {
      line.dailyRate = dailyRate;
      line.shiftCount = shiftCount;
      line.shiftDates = sortedShiftDates;
    }

    if (withholdings) {
      const profile = withholdings.profiles.get(cm.id) ?? null;
      const deductions = calcDeductions({ grossPay, profile, orgDefaults: withholdings.orgDefaults });
      line.deductions = deductions;
      line.netPay = grossPay - deductions.total;
      line.employer = calcEmployerCosts({ grossPay, profile, orgDefaults: withholdings.orgDefaults });
    }

    // Reference incidentNames for adjustments shown in UI (no-op consumer hint)
    void incidentNames;

    lines.push(line);
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
      deductions: acc.deductions + (l.deductions?.total ?? 0),
      net: acc.net + (l.netPay ?? l.grossPay),
    }),
    { hours: 0, otHours: 0, gross: 0, deductions: 0, net: 0 }
  );
}
