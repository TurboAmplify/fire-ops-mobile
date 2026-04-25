/**
 * Payroll report data fetcher: pulls the same shift tickets, crew, comp, and
 * adjustments that the live Payroll page uses, then runs the existing
 * aggregation in `src/lib/payroll.ts`. No business-logic changes.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  aggregateCrewPayroll,
  type CrewPayrollLine,
  type ShiftTicketLite,
  type WithholdingProfile,
  type OrgPayrollDefaults,
  DEFAULT_ORG_PAYROLL,
} from "@/lib/payroll";

export interface PayrollReportInput {
  organizationId: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  incidentFilter: string | string[]; // "all" or single id or array of ids
  crewFilter: string;                 // "all" or crew member id
}

export interface ShiftEntryRow {
  ticketId: string;
  date: string;
  incidentName: string;
  crewMemberId: string;
  crewName: string;
  role: string;
  opStart: string;
  opStop: string;
  sbStart: string;
  sbStop: string;
  total: number;
  remarks: string;
}

export interface PayrollReportData {
  lines: CrewPayrollLine[];
  shiftEntries: ShiftEntryRow[];
  rangeLabel: string;
}

export async function fetchPayrollReport(
  input: PayrollReportInput,
  rangeLabel: string,
): Promise<PayrollReportData> {
  const [ticketsRes, crewRes, compRes, withholdingRes, orgRes, adjRes, incRes] = await Promise.all([
    supabase
      .from("shift_tickets")
      .select("id, personnel_entries, incident_trucks!inner(incidents:incidents!incident_trucks_incident_id_fkey(id, name))")
      .eq("organization_id", input.organizationId),
    supabase
      .from("crew_members")
      .select("id, name, role")
      .eq("organization_id", input.organizationId),
    supabase
      .from("crew_compensation")
      .select("crew_member_id, hourly_rate, hw_rate, pay_method, daily_rate")
      .eq("organization_id", input.organizationId),
    supabase
      .from("crew_compensation")
      .select("crew_member_id, filing_status, dependents_count, use_default_withholding, federal_pct_override, extra_withholding, state_pct_override, social_security_exempt, medicare_exempt, other_deductions, notes")
      .eq("organization_id", input.organizationId),
    supabase
      .from("org_payroll_settings")
      .select("federal_pct, social_security_pct, medicare_pct, state_pct, state_enabled, extra_withholding_default, workers_comp_pct")
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
    supabase
      .from("payroll_adjustments")
      .select("id, crew_member_id, incident_id, adjustment_date, adjustment_type, hours, amount, reason")
      .eq("organization_id", input.organizationId),
    supabase
      .from("incidents")
      .select("id, name")
      .eq("organization_id", input.organizationId),
  ]);

  for (const r of [ticketsRes, crewRes, compRes, withholdingRes, adjRes, incRes]) {
    if (r.error) throw r.error;
  }

  const tickets: ShiftTicketLite[] = (ticketsRes.data ?? []).map((st: any) => ({
    id: st.id,
    personnel_entries: st.personnel_entries,
    incident_id: st.incident_trucks?.incidents?.id ?? null,
    incident_name: st.incident_trucks?.incidents?.name ?? "Unassigned",
  }));

  const compMap = new Map<string, { hourly_rate: number | null; hw_rate: number | null; pay_method?: "hourly" | "daily" | null; daily_rate?: number | null }>();
  (compRes.data ?? []).forEach((c: any) => compMap.set(c.crew_member_id, {
    hourly_rate: c.hourly_rate,
    hw_rate: c.hw_rate,
    pay_method: c.pay_method,
    daily_rate: c.daily_rate,
  }));

  const profileMap = new Map<string, WithholdingProfile>();
  (withholdingRes.data ?? []).forEach((r: any) => {
    profileMap.set(r.crew_member_id, {
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

  const orgDefaults: OrgPayrollDefaults = orgRes.data
    ? {
        federal_pct: Number(orgRes.data.federal_pct),
        social_security_pct: Number(orgRes.data.social_security_pct),
        medicare_pct: Number(orgRes.data.medicare_pct),
        state_pct: Number(orgRes.data.state_pct),
        state_enabled: !!orgRes.data.state_enabled,
        extra_withholding_default: Number(orgRes.data.extra_withholding_default),
      }
    : DEFAULT_ORG_PAYROLL;

  const incidentNamesMap = new Map<string, string>();
  (incRes.data ?? []).forEach((i: any) => incidentNamesMap.set(i.id, i.name));

  let lines = aggregateCrewPayroll({
    shiftTickets: tickets,
    crewMembers: (crewRes.data ?? []) as { id: string; name: string; role: string }[],
    compensation: compMap,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    incidentFilter: input.incidentFilter,
    adjustments: (adjRes.data ?? []) as any,
    incidentNames: incidentNamesMap,
    withholdings: { profiles: profileMap, orgDefaults },
  });

  if (input.crewFilter !== "all") {
    lines = lines.filter((l) => l.crewMemberId === input.crewFilter);
  }

  // Build per-shift entry rows so admins can audit dates/times against pay.
  // Apply the same filters used in aggregation: incident scope, date range,
  // crew filter, and only crew members that exist in this org.
  const allowedIncidents: Set<string> | null = (() => {
    if (input.incidentFilter === "all") return null;
    if (Array.isArray(input.incidentFilter)) {
      return input.incidentFilter.length === 0 ? null : new Set(input.incidentFilter);
    }
    return new Set([input.incidentFilter]);
  })();

  const crewByName = new Map<string, { id: string; name: string; role: string }>();
  ((crewRes.data ?? []) as { id: string; name: string; role: string }[]).forEach((cm) => {
    crewByName.set(cm.name.toLowerCase().trim(), cm);
  });

  const inRange = (d: string): boolean => {
    if (!input.rangeStart && !input.rangeEnd) return true;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return false;
    if (input.rangeStart && dt < input.rangeStart) return false;
    if (input.rangeEnd && dt > input.rangeEnd) return false;
    return true;
  };

  const shiftEntries: ShiftEntryRow[] = [];
  tickets.forEach((st) => {
    if (allowedIncidents !== null && (!st.incident_id || !allowedIncidents.has(st.incident_id))) return;
    const entries = Array.isArray(st.personnel_entries) ? (st.personnel_entries as any[]) : [];
    entries.forEach((pe) => {
      if (!pe?.operator_name || !pe?.date) return;
      if (!inRange(pe.date)) return;
      const cm = crewByName.get(String(pe.operator_name).toLowerCase().trim());
      if (!cm) return;
      if (input.crewFilter !== "all" && cm.id !== input.crewFilter) return;
      shiftEntries.push({
        ticketId: st.id,
        date: pe.date,
        incidentName: st.incident_name ?? "Unassigned",
        crewMemberId: cm.id,
        crewName: cm.name,
        role: cm.role,
        opStart: pe.op_start ?? "",
        opStop: pe.op_stop ?? "",
        sbStart: pe.sb_start ?? "",
        sbStop: pe.sb_stop ?? "",
        total: Number(pe.total) || 0,
        remarks: pe.remarks ?? "",
      });
    });
  });

  shiftEntries.sort((a, b) => {
    if (a.crewName !== b.crewName) return a.crewName.localeCompare(b.crewName);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.incidentName.localeCompare(b.incidentName);
  });

  return { lines, shiftEntries, rangeLabel };
}
