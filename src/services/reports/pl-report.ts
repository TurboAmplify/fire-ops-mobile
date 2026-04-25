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
  expenseTotal: number;     // expenses tied to this incident
  totalCost: number;        // laborTrueCost + expenseTotal
  expenseCount: number;
}

export interface PLReportData {
  rows: PLIncidentRow[];
  unassignedExpenses: number;
  totals: {
    laborGross: number;
    employerTaxes: number;
    laborTrueCost: number;
    expenseTotal: number;
    totalCost: number;
  };
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
    .select("id, date, amount, category, vendor, status, description, incident_id, incidents:incidents!expenses_incident_id_fkey(name)")
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
        laborTrueCost: 0,
        expenseTotal: 0,
        totalCost: 0,
        expenseCount: 0,
      };
      incidentMap.set(key, row);
    }
    return row;
  };

  payroll.lines.forEach((l) => {
    const employerTotal = l.employer?.total ?? 0;
    const grossTotal = l.grossPay || 1; // avoid /0
    l.byIncident.forEach((inc) => {
      const row = ensureRow(inc.incidentId, inc.incidentName);
      const share = (inc.grossPay / grossTotal) * employerTotal;
      row.laborGross += inc.grossPay;
      row.employerTaxes += share;
      row.laborTrueCost += inc.grossPay + share;
    });
  });

  let unassignedExpenses = 0;
  expenseRows.forEach((e) => {
    if (!e.incidentId) {
      unassignedExpenses += e.amount;
      const row = ensureRow(null, "Unassigned");
      row.expenseTotal += e.amount;
      row.expenseCount += 1;
    } else {
      const row = ensureRow(e.incidentId, e.incidentName);
      row.expenseTotal += e.amount;
      row.expenseCount += 1;
    }
  });

  const rows = Array.from(incidentMap.values());
  rows.forEach((r) => { r.totalCost = r.laborTrueCost + r.expenseTotal; });
  rows.sort((a, b) => b.totalCost - a.totalCost);

  const totals = rows.reduce(
    (acc, r) => ({
      laborGross: acc.laborGross + r.laborGross,
      employerTaxes: acc.employerTaxes + r.employerTaxes,
      laborTrueCost: acc.laborTrueCost + r.laborTrueCost,
      expenseTotal: acc.expenseTotal + r.expenseTotal,
      totalCost: acc.totalCost + r.totalCost,
    }),
    { laborGross: 0, employerTaxes: 0, laborTrueCost: 0, expenseTotal: 0, totalCost: 0 },
  );

  return {
    rows,
    unassignedExpenses,
    totals,
    rangeLabel,
    crewLines: payroll.lines,
    expenseRows,
  };
}
