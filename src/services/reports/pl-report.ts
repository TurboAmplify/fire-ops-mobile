/**
 * P&L (Profit & Loss) report — combines fully-burdened payroll labor cost with
 * expenses, grouped by incident. Uses the same payroll fetcher to guarantee
 * the labor numbers tie back exactly to the Payroll Summary report.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchPayrollReport } from "./payroll-report";
import type { CrewPayrollLine } from "@/lib/payroll";

export interface PLIncidentRow {
  incidentId: string | null;
  incidentName: string;
  laborGross: number;       // gross wages for this incident
  employerTaxes: number;    // FICA match attributable to this incident
  workersComp: number;      // workers comp insurance cost attributable to this incident
  laborTrueCost: number;    // gross + employer match + workers comp
  expenseTotal: number;     // ALL expenses tied to this incident (vendor + reimbursement)
  vendorExpenseTotal: number;        // expense_type = 'company' (paid to vendors)
  reimbursementExpenseTotal: number; // expense_type = 'reimbursement' (owed to crew)
  totalCost: number;        // laborTrueCost + expenseTotal + factoringFee
  expenseCount: number;
  revenue: number;          // projected billable truck day-rate revenue for this incident
  truckDays: number;        // total billable truck-days on this incident
  factoringFee: number;     // invoice factor fee taken off revenue (when enabled)
  profit: number;           // PROJECTED profit = revenue - totalCost
  /** Sum of OF-286 invoice totals on file for this incident (null when no OF-286 amount entered). */
  of286Total: number | null;
  /** Actual profit = of286Total - totalCost (null when no OF-286 amount entered). */
  actualProfit: number | null;
}

export interface PLReportData {
  rows: PLIncidentRow[];
  unassignedExpenses: number;
  totals: {
    laborGross: number;
    employerTaxes: number;
    workersComp: number;
    laborTrueCost: number;
    expenseTotal: number;
    vendorExpenseTotal: number;
    reimbursementExpenseTotal: number;
    totalCost: number;
    revenue: number;
    truckDays: number;
    factoringFee: number;
    profit: number;
    of286Total: number;        // sums only the rows that have an entered total
    actualProfit: number;      // sums only the rows where actualProfit is non-null
  };
  factoringPct: number;        // % applied (0 when disabled)
  factoringEnabled: boolean;
  rangeLabel: string;
  /** Underlying crew lines (used for the optional detail/expanded variant). */
  crewLines: CrewPayrollLine[];
  expenseRows: PLExpenseRow[];
}

export interface PLExpenseRow {
  id: string;
  date: string;
  incidentId: string | null;
  incidentName: string;
  category: string;
  vendor: string | null;
  amount: number;
  status: string;
  description: string | null;
  expenseType: "company" | "reimbursement";
}

interface PLInput {
  organizationId: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  incidentFilter: string | string[];
}

function dateOnlyOrNull(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : null;
}

export async function fetchPLReport(input: PLInput, rangeLabel: string): Promise<PLReportData> {
  // Pull payroll (re-uses the exact same aggregation as the Payroll report)
  const payroll = await fetchPayrollReport(
    {
      organizationId: input.organizationId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      incidentFilter: input.incidentFilter,
      crewFilter: "all",
    },
    rangeLabel,
  );

  // Pull expenses for the same scope
  let q = supabase
    .from("expenses")
    .select("id, date, amount, category, vendor, status, description, expense_type, incident_id, incidents:incidents!expenses_incident_id_fkey(name)")
    .eq("organization_id", input.organizationId)
    .order("date", { ascending: false });
  if (input.rangeStart) q = q.gte("date", dateOnlyOrNull(input.rangeStart)!);
  if (input.rangeEnd) q = q.lte("date", dateOnlyOrNull(input.rangeEnd)!);
  const { data: expenseData, error } = await q;
  if (error) throw error;

  const allowedIncidents: Set<string> | null = (() => {
    if (input.incidentFilter === "all") return null;
    if (Array.isArray(input.incidentFilter)) {
      return input.incidentFilter.length === 0 ? null : new Set(input.incidentFilter);
    }
    return new Set([input.incidentFilter]);
  })();

  const expenseRows: PLExpenseRow[] = (expenseData ?? [])
    .map((e: any) => ({
      id: e.id,
      date: e.date,
      incidentId: e.incident_id ?? null,
      incidentName: e.incidents?.name ?? "Unassigned",
      category: e.category,
      vendor: e.vendor ?? null,
      amount: Number(e.amount) || 0,
      status: e.status,
      description: e.description ?? null,
      expenseType: (e.expense_type === "reimbursement" ? "reimbursement" : "company") as "company" | "reimbursement",
    }))
    .filter((e) => {
      if (!allowedIncidents) return true;
      return e.incidentId && allowedIncidents.has(e.incidentId);
    });

  // Build per-incident map. Labor: walk each crew line's byIncident; employer
  // tax is allocated proportionally to that incident's share of the crew's
  // gross pay (since FICA match is computed on the total gross).
  const incidentMap = new Map<string, PLIncidentRow>();
  const ensureRow = (id: string | null, name: string): PLIncidentRow => {
    const key = id ?? "_unassigned";
    let row = incidentMap.get(key);
    if (!row) {
      row = {
        incidentId: id,
        incidentName: name,
        laborGross: 0,
        employerTaxes: 0,
        workersComp: 0,
        laborTrueCost: 0,
        expenseTotal: 0,
        vendorExpenseTotal: 0,
        reimbursementExpenseTotal: 0,
        totalCost: 0,
        expenseCount: 0,
        revenue: 0,
        truckDays: 0,
        factoringFee: 0,
        profit: 0,
        of286Total: null,
        actualProfit: null,
      };
      incidentMap.set(key, row);
    }
    return row;
  };

  payroll.lines.forEach((l) => {
    const employerFica = (l.employer?.socialSecurity ?? 0) + (l.employer?.medicare ?? 0);
    const workersComp = l.employer?.workersComp ?? 0;
    const grossTotal = l.grossPay || 1; // avoid /0
    l.byIncident.forEach((inc) => {
      const row = ensureRow(inc.incidentId, inc.incidentName);
      const ficaShare = (inc.grossPay / grossTotal) * employerFica;
      const wcShare = (inc.grossPay / grossTotal) * workersComp;
      row.laborGross += inc.grossPay;
      row.employerTaxes += ficaShare;
      row.workersComp += wcShare;
      row.laborTrueCost += inc.grossPay + ficaShare + wcShare;
    });
  });

  let unassignedExpenses = 0;
  expenseRows.forEach((e) => {
    const row = e.incidentId
      ? ensureRow(e.incidentId, e.incidentName)
      : ensureRow(null, "Unassigned");
    if (!e.incidentId) unassignedExpenses += e.amount;
    row.expenseTotal += e.amount;
    row.expenseCount += 1;
    if (e.expenseType === "reimbursement") {
      row.reimbursementExpenseTotal += e.amount;
    } else {
      row.vendorExpenseTotal += e.amount;
    }
  });

  // Revenue: count distinct shift-ticket dates per incident_truck and multiply
  // by that truck's day_rate. Dates come from each personnel_entry's `date`,
  // falling back to the ticket's created_at if no entries are present.
  const { data: ticketRows, error: ticketsErr } = await supabase
    .from("shift_tickets")
    .select("id, created_at, personnel_entries, incident_truck_id, incident_trucks:incident_trucks!shift_tickets_incident_truck_id_fkey(incident_id, truck_id, trucks:trucks!incident_trucks_truck_id_fkey(day_rate))")
    .eq("organization_id", input.organizationId);
  if (ticketsErr) throw ticketsErr;

  // Group: incident_id -> truck_id -> Set<dateString>
  const truckDaysByIncident = new Map<string, Map<string, { dates: Set<string>; dayRate: number }>>();
  (ticketRows ?? []).forEach((t: any) => {
    const it = t.incident_trucks;
    if (!it?.incident_id || !it?.truck_id) return;
    const incidentId: string = it.incident_id;
    if (allowedIncidents && !allowedIncidents.has(incidentId)) return;

    // Pull all dates from personnel_entries; fall back to created_at
    const entries: any[] = Array.isArray(t.personnel_entries) ? t.personnel_entries : [];
    const dateStrings: string[] = entries
      .map((e) => (typeof e?.date === "string" ? e.date : null))
      .filter((d): d is string => !!d);
    if (dateStrings.length === 0 && t.created_at) {
      dateStrings.push(String(t.created_at).slice(0, 10));
    }

    // Apply date range filter
    const filtered = dateStrings.filter((d) => {
      if (input.rangeStart && d < dateOnlyOrNull(input.rangeStart)!) return false;
      if (input.rangeEnd && d > dateOnlyOrNull(input.rangeEnd)!) return false;
      return true;
    });
    if (filtered.length === 0) return;

    const dayRate = Number(it.trucks?.day_rate ?? 0) || 0;
    let truckMap = truckDaysByIncident.get(incidentId);
    if (!truckMap) {
      truckMap = new Map();
      truckDaysByIncident.set(incidentId, truckMap);
    }
    let entry = truckMap.get(it.truck_id);
    if (!entry) {
      entry = { dates: new Set(), dayRate };
      truckMap.set(it.truck_id, entry);
    }
    filtered.forEach((d) => entry!.dates.add(d));
  });

  // Pull incident names for any incidents that only show up in revenue (no labor/expense rows yet)
  const missingIncidentIds = Array.from(truckDaysByIncident.keys()).filter(
    (id) => !incidentMap.has(id),
  );
  let nameLookup: Record<string, string> = {};
  if (missingIncidentIds.length > 0) {
    const { data: incRows } = await supabase
      .from("incidents")
      .select("id, name")
      .in("id", missingIncidentIds);
    (incRows ?? []).forEach((r: any) => { nameLookup[r.id] = r.name; });
  }

  truckDaysByIncident.forEach((truckMap, incidentId) => {
    const row = ensureRow(incidentId, nameLookup[incidentId] ?? incidentMap.get(incidentId)?.incidentName ?? "Incident");
    truckMap.forEach(({ dates, dayRate }) => {
      const days = dates.size;
      row.truckDays += days;
      row.revenue += days * dayRate;
    });
  });

  // Pull factoring settings from org payroll defaults
  const { data: orgSettings } = await supabase
    .from("org_payroll_settings")
    .select("factoring_pct, factoring_enabled")
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  const factoringEnabled = (orgSettings as any)?.factoring_enabled ?? true;
  const factoringPct = factoringEnabled ? Number((orgSettings as any)?.factoring_pct ?? 4.5) : 0;

  // Pull OF-286 invoice totals per incident in scope. An incident can have
  // multiple OF-286 docs (split assignments) — sum the entered totals.
  const incidentIdsWithRows = Array.from(incidentMap.values())
    .map((r) => r.incidentId)
    .filter((id): id is string => !!id);
  const of286ByIncident = new Map<string, number>();
  if (incidentIdsWithRows.length > 0) {
    const { data: of286Rows } = await supabase
      .from("incident_documents")
      .select("incident_id, of286_invoice_total")
      .eq("document_type", "of286")
      .in("incident_id", incidentIdsWithRows);
    (of286Rows ?? []).forEach((r: any) => {
      const total = r.of286_invoice_total;
      if (total == null) return;
      const num = Number(total);
      if (!Number.isFinite(num)) return;
      of286ByIncident.set(r.incident_id, (of286ByIncident.get(r.incident_id) ?? 0) + num);
    });
  }

  const rows = Array.from(incidentMap.values());
  rows.forEach((r) => {
    r.factoringFee = (r.revenue * factoringPct) / 100;
    r.totalCost = r.laborTrueCost + r.expenseTotal + r.factoringFee;
    r.profit = r.revenue - r.totalCost;
    if (r.incidentId && of286ByIncident.has(r.incidentId)) {
      r.of286Total = of286ByIncident.get(r.incidentId)!;
      r.actualProfit = r.of286Total - r.totalCost;
    }
  });
  rows.sort((a, b) => b.totalCost - a.totalCost);

  const totals = rows.reduce(
    (acc, r) => ({
      laborGross: acc.laborGross + r.laborGross,
      employerTaxes: acc.employerTaxes + r.employerTaxes,
      workersComp: acc.workersComp + r.workersComp,
      laborTrueCost: acc.laborTrueCost + r.laborTrueCost,
      expenseTotal: acc.expenseTotal + r.expenseTotal,
      vendorExpenseTotal: acc.vendorExpenseTotal + r.vendorExpenseTotal,
      reimbursementExpenseTotal: acc.reimbursementExpenseTotal + r.reimbursementExpenseTotal,
      totalCost: acc.totalCost + r.totalCost,
      revenue: acc.revenue + r.revenue,
      truckDays: acc.truckDays + r.truckDays,
      factoringFee: acc.factoringFee + r.factoringFee,
      profit: acc.profit + r.profit,
      of286Total: acc.of286Total + (r.of286Total ?? 0),
      actualProfit: acc.actualProfit + (r.actualProfit ?? 0),
    }),
    { laborGross: 0, employerTaxes: 0, workersComp: 0, laborTrueCost: 0, expenseTotal: 0, vendorExpenseTotal: 0, reimbursementExpenseTotal: 0, totalCost: 0, revenue: 0, truckDays: 0, factoringFee: 0, profit: 0, of286Total: 0, actualProfit: 0 },
  );

  return {
    rows,
    unassignedExpenses,
    totals,
    factoringPct,
    factoringEnabled,
    rangeLabel,
    crewLines: payroll.lines,
    expenseRows,
  };
}
