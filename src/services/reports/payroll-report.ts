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
  incidentFilter: string; // "all" or incident id
  crewFilter: string;     // "all" or crew member id
}

export interface PayrollReportData {
  lines: CrewPayrollLine[];
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
      .select("federal_pct, social_security_pct, medicare_pct, state_pct, state_enabled, extra_withholding_default")
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

  return { lines, rangeLabel };
}
