import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/reports/DateRangePicker";
import { ScopePicker } from "@/components/reports/ScopePicker";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import {
  Loader2, DollarSign, ClipboardCheck, Receipt, FileSignature,
  ScrollText, Flame, Users, ShieldAlert, AlertTriangle,
} from "lucide-react";
import { fetchPayrollReport } from "@/services/reports/payroll-report";
import { fetchActivityRows, type ActivityKind } from "@/services/reports/activity-report";
import { fetchAuditRows, type AuditKind } from "@/services/reports/audit-report";
import { fetchIncidentCostRows, fetchCrewRoster } from "@/services/reports/incident-report";
import { downloadCsv } from "@/services/reports/exporters/csv";
import { downloadExcel } from "@/services/reports/exporters/excel";
import { downloadTablePdf } from "@/services/reports/exporters/pdf-table";
import { downloadPaystubsBundle } from "@/services/reports/exporters/pdf-paystubs-bundle";
import { useToast } from "@/hooks/use-toast";

type Format = "pdf" | "csv" | "excel";

export default function AdminReports() {
  const { isAdmin, membership, loading } = useOrganization();
  const { isPlatformAdmin } = usePlatformAdmin();

  if (loading) {
    return (
      <AppShell title="Reports">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const orgId = membership!.organizationId;
  const orgName = membership!.organizationName ?? "Organization";

  return (
    <AppShell title="Reports" showBack>
      <div className="p-4 space-y-5 pb-20">
        <p className="text-xs text-muted-foreground">
          Generate, print, or share reports across payroll, activity, audit, and incident data.
        </p>

        <PayrollReportsCard organizationId={orgId} organizationName={orgName} />
        <ActivityReportsCard organizationId={orgId} organizationName={orgName} />
        <AuditReportsCard organizationId={orgId} organizationName={orgName} isPlatformAdmin={isPlatformAdmin} />
        <IncidentCostCard organizationId={orgId} organizationName={orgName} />
        <CrewRosterCard organizationId={orgId} organizationName={orgName} />
      </div>
    </AppShell>
  );
}

/* ---------------- Payroll ---------------- */

function PayrollReportsCard({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [scope, setScope] = useState<{ crewId: string; incidentIds: string[] }>({ crewId: "all", incidentIds: [] });
  const { toast } = useToast();

  const buildExport = (variant: "summary" | "detail" | "paystubs") => async (fmt: Format) => {
    const incidentFilter = scope.incidentIds.length === 0 ? "all" : scope.incidentIds;
    let effectiveRange = range;
    let { lines, shiftEntries } = await fetchPayrollReport(
      { organizationId, rangeStart: range.from, rangeEnd: range.to, incidentFilter, crewFilter: scope.crewId },
      range.label,
    );

    // If specific incidents are selected and the date range filtered everything
    // out, retry across all time so admins reliably get the data for the fires
    // they explicitly picked. Notify so they understand the range was widened.
    if (lines.length === 0 && Array.isArray(incidentFilter) && (range.from || range.to)) {
      const fallback = await fetchPayrollReport(
        { organizationId, rangeStart: null, rangeEnd: null, incidentFilter, crewFilter: scope.crewId },
        "All Time",
      );
      if (fallback.lines.length > 0) {
        lines = fallback.lines;
        shiftEntries = fallback.shiftEntries;
        effectiveRange = { from: null, to: null, label: "All Time" };
        toast({
          title: "Date range widened",
          description: `No data in "${range.label}" for the selected incident(s). Showing All Time instead.`,
        });
      }
    }

    if (lines.length === 0) {
      toast({
        title: "No payroll data",
        description: "No hours or adjustments for the selected scope. Try widening the date range or removing the incident filter.",
      });
      return;
    }

    const baseName = `payroll_${variant}_${effectiveRange.label.replace(/\s+/g, "_")}`;

    if (variant === "paystubs") {
      // Paystubs bundle is PDF-only (CSV/Excel of a paystub doesn't make sense)
      if (fmt !== "pdf") {
        toast({ title: "Paystubs export as PDF", description: "Use Summary or Detail for spreadsheet formats." });
        return;
      }
      await downloadPaystubsBundle({ lines, organizationName, periodLabel: effectiveRange.label, filenameBase: baseName });
      return;
    }

    if (variant === "summary") {
      const headers = ["Crew", "Role", "Reg Hrs", "OT Hrs", "Reg Pay", "H&W Pay", "OT Pay", "Adjustments", "Gross", "Deductions", "Net"];
      const rows = lines.map((l) => [
        l.name, l.role, l.regularHours, l.overtimeHours, l.regularPay, l.hwPay, l.overtimePay,
        l.adjustmentTotal, l.grossPay, l.deductions?.total ?? 0, l.netPay ?? l.grossPay,
      ]);
      if (fmt === "csv") return downloadCsv(baseName, headers, rows);
      if (fmt === "excel") return downloadExcel(baseName, [{
        name: "Payroll Summary",
        columns: [
          { header: "Crew", key: "crew", width: 22 },
          { header: "Role", key: "role", width: 16 },
          { header: "Reg Hrs", key: "reg", width: 10, format: "number" },
          { header: "OT Hrs", key: "ot", width: 10, format: "number" },
          { header: "Reg Pay", key: "rp", width: 14, format: "currency" },
          { header: "H&W", key: "hw", width: 12, format: "currency" },
          { header: "OT Pay", key: "op", width: 12, format: "currency" },
          { header: "Adjustments", key: "adj", width: 14, format: "currency" },
          { header: "Gross", key: "gross", width: 14, format: "currency" },
          { header: "Deductions", key: "ded", width: 14, format: "currency" },
          { header: "Net", key: "net", width: 14, format: "currency" },
        ],
        rows: lines.map((l) => ({
          crew: l.name, role: l.role, reg: l.regularHours, ot: l.overtimeHours,
          rp: l.regularPay, hw: l.hwPay, op: l.overtimePay, adj: l.adjustmentTotal,
          gross: l.grossPay, ded: l.deductions?.total ?? 0, net: l.netPay ?? l.grossPay,
        })),
      }]);
      return downloadTablePdf({
        title: "Payroll Summary",
        subtitle: effectiveRange.label,
        organizationName,
        filenameBase: baseName,
        landscape: true,
        sections: [{
          columns: [
            { header: "Crew", key: "crew", width: 110 },
            { header: "Role", key: "role", width: 80 },
            { header: "Reg", key: "reg", width: 50, align: "right", format: (v) => Number(v).toFixed(2) },
            { header: "OT", key: "ot", width: 50, align: "right", format: (v) => Number(v).toFixed(2) },
            { header: "Reg Pay", key: "rp", width: 65, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "H&W", key: "hw", width: 60, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "OT Pay", key: "op", width: 65, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "Adj", key: "adj", width: 60, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "Gross", key: "gross", width: 70, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "Ded", key: "ded", width: 60, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
            { header: "Net", key: "net", width: 70, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
          ],
          rows: lines.map((l) => ({
            crew: l.name, role: l.role, reg: l.regularHours, ot: l.overtimeHours,
            rp: l.regularPay, hw: l.hwPay, op: l.overtimePay, adj: l.adjustmentTotal,
            gross: l.grossPay, ded: l.deductions?.total ?? 0, net: l.netPay ?? l.grossPay,
          })),
        }],
      });
    }

    // Detail — for each crew, list every shift ticket entry (date + times),
    // then the per-incident roll-up, then any adjustments. This lets admins
    // tie individual shift dates/times directly to the calculated hours/pay.
    const detailRows: any[] = [];
    const entriesByCrew = new Map<string, typeof shiftEntries>();
    shiftEntries.forEach((e) => {
      const list = entriesByCrew.get(e.crewMemberId) ?? [];
      list.push(e);
      entriesByCrew.set(e.crewMemberId, list);
    });

    lines.forEach((l) => {
      const crewShifts = entriesByCrew.get(l.crewMemberId) ?? [];
      crewShifts.forEach((e) => {
        detailRows.push({
          crew: l.name,
          role: l.role,
          incident: `Shift — ${e.incidentName}`,
          date: e.date,
          op: e.opStart && e.opStop ? `${e.opStart}-${e.opStop}` : "",
          sb: e.sbStart && e.sbStop ? `${e.sbStart}-${e.sbStop}` : "",
          hrs: e.total, reg: "", ot: "", rp: "", hw: "", op$: "", gross: "",
        });
      });
      l.byIncident.forEach((inc) => {
        detailRows.push({
          crew: l.name, role: l.role, incident: `Total — ${inc.incidentName}`,
          date: "", op: "", sb: "",
          hrs: inc.totalHours, reg: inc.regularHours, ot: inc.overtimeHours,
          rp: inc.regularPay, hw: inc.hwPay, op$: inc.overtimePay, gross: inc.grossPay,
        });
      });
      l.adjustments.forEach((a) => {
        detailRows.push({
          crew: l.name, role: l.role, incident: `[Adjustment] ${a.reason}`,
          date: a.date, op: "", sb: "",
          hrs: a.hours ?? 0, reg: 0, ot: 0, rp: 0, hw: 0, op$: 0, gross: a.amount,
        });
      });
    });

    if (fmt === "csv") {
      return downloadCsv(baseName,
        ["Crew", "Role", "Incident / Shift / Adjustment", "Date", "Op Start-Stop", "SB Start-Stop", "Hours", "Reg Hrs", "OT Hrs", "Reg Pay", "H&W", "OT Pay", "Total"],
        detailRows.map((r) => [r.crew, r.role, r.incident, r.date, r.op, r.sb, r.hrs, r.reg, r.ot, r.rp, r.hw, r.op$, r.gross]),
      );
    }
    if (fmt === "excel") {
      return downloadExcel(baseName, [{
        name: "Payroll Detail",
        columns: [
          { header: "Crew", key: "crew", width: 22 },
          { header: "Role", key: "role", width: 14 },
          { header: "Incident / Shift / Adjustment", key: "incident", width: 34 },
          { header: "Date", key: "date", width: 12 },
          { header: "Op Start-Stop", key: "op", width: 14 },
          { header: "SB Start-Stop", key: "sb", width: 14 },
          { header: "Hours", key: "hrs", width: 9, format: "number" },
          { header: "Reg Hrs", key: "reg", width: 9, format: "number" },
          { header: "OT Hrs", key: "ot", width: 9, format: "number" },
          { header: "Reg Pay", key: "rp", width: 12, format: "currency" },
          { header: "H&W", key: "hw", width: 11, format: "currency" },
          { header: "OT Pay", key: "op$", width: 11, format: "currency" },
          { header: "Total", key: "gross", width: 13, format: "currency" },
        ],
        rows: detailRows,
      }]);
    }
    return downloadTablePdf({
      title: "Payroll Detail",
      subtitle: effectiveRange.label,
      organizationName,
      filenameBase: baseName,
      landscape: true,
      sections: [{
        columns: [
          { header: "Crew", key: "crew", width: 85 },
          { header: "Role", key: "role", width: 55 },
          { header: "Incident / Shift / Adj", key: "incident", width: 135 },
          { header: "Date", key: "date", width: 55 },
          { header: "Op", key: "op", width: 65 },
          { header: "SB", key: "sb", width: 65 },
          { header: "Hrs", key: "hrs", width: 38, align: "right", format: (v) => v === "" ? "" : Number(v).toFixed(2) },
          { header: "Reg", key: "reg", width: 38, align: "right", format: (v) => v === "" ? "" : Number(v).toFixed(2) },
          { header: "OT", key: "ot", width: 38, align: "right", format: (v) => v === "" ? "" : Number(v).toFixed(2) },
          { header: "Reg $", key: "rp", width: 50, align: "right", format: (v) => v === "" ? "" : `$${Number(v).toFixed(2)}` },
          { header: "H&W", key: "hw", width: 45, align: "right", format: (v) => v === "" ? "" : `$${Number(v).toFixed(2)}` },
          { header: "OT $", key: "op$", width: 50, align: "right", format: (v) => v === "" ? "" : `$${Number(v).toFixed(2)}` },
          { header: "Total", key: "gross", width: 55, align: "right", format: (v) => v === "" ? "" : `$${Number(v).toFixed(2)}` },
        ],
        rows: detailRows,
      }],
    });
  };

  return (
    <ReportCard
      icon={DollarSign}
      title="Payroll"
      description="Per-crew totals, by-incident breakdown, or full paystub bundle."
    >
      <DateRangePicker value={range} onChange={setRange} />
      <ScopePicker crewId={scope.crewId} incidentIds={scope.incidentIds} onChange={setScope} />
      <div className="space-y-2 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary (one row per crew)</p>
        <ReportExportButtons onExport={buildExport("summary")} />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detail (per incident / adjustment)</p>
        <ReportExportButtons onExport={buildExport("detail")} />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paystub bundle</p>
        <ReportExportButtons onExport={buildExport("paystubs")} hide={{ csv: true, excel: true }} />
      </div>
    </ReportCard>
  );
}

/* ---------------- Activity ---------------- */

function ActivityReportsCard({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [kind, setKind] = useState<ActivityKind>("inspections");
  const { toast } = useToast();

  const onExport = async (fmt: Format) => {
    const rows = await fetchActivityRows(kind, { organizationId, rangeStart: range.from, rangeEnd: range.to });
    if (rows.length === 0) {
      toast({ title: "No data", description: `No ${kind} in this range.` });
      return;
    }
    const baseName = `activity_${kind}_${range.label.replace(/\s+/g, "_")}`;
    const headers = kind === "expenses"
      ? ["When", "Vendor / Category", "Category", "Amount", "Status", "Notes"]
      : ["When", "Subject", "Detail", "Notes"];

    if (fmt === "csv") {
      const dataRows = rows.map((r) => kind === "expenses"
        ? [new Date(r.occurred_at).toLocaleString(), r.primary, r.secondary ?? "", r.amount ?? "", r.status ?? "", r.notes ?? ""]
        : [new Date(r.occurred_at).toLocaleString(), r.primary, r.secondary ?? "", r.notes ?? ""]);
      return downloadCsv(baseName, headers, dataRows);
    }

    if (fmt === "excel") {
      return downloadExcel(baseName, [{
        name: kind.charAt(0).toUpperCase() + kind.slice(1),
        columns: kind === "expenses" ? [
          { header: "When", key: "when", width: 22 },
          { header: "Vendor / Category", key: "primary", width: 28 },
          { header: "Category", key: "secondary", width: 18 },
          { header: "Amount", key: "amount", width: 12, format: "currency" },
          { header: "Status", key: "status", width: 12 },
          { header: "Notes", key: "notes", width: 40 },
        ] : [
          { header: "When", key: "when", width: 22 },
          { header: "Subject", key: "primary", width: 28 },
          { header: "Detail", key: "secondary", width: 22 },
          { header: "Notes", key: "notes", width: 40 },
        ],
        rows: rows.map((r) => ({
          when: new Date(r.occurred_at).toLocaleString(),
          primary: r.primary, secondary: r.secondary ?? "",
          amount: r.amount, status: r.status, notes: r.notes ?? "",
        })),
      }]);
    }

    return downloadTablePdf({
      title: `Activity Log — ${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
      subtitle: range.label,
      organizationName,
      filenameBase: baseName,
      landscape: kind === "expenses",
      sections: [{
        columns: kind === "expenses" ? [
          { header: "When", key: "when", width: 110, format: (v) => new Date(v as string).toLocaleString() },
          { header: "Vendor / Category", key: "primary", width: 140 },
          { header: "Category", key: "secondary", width: 90 },
          { header: "Amount", key: "amount", width: 70, align: "right", format: (v) => v == null ? "" : `$${Number(v).toFixed(2)}` },
          { header: "Status", key: "status", width: 70 },
          { header: "Notes", key: "notes", width: 200 },
        ] : [
          { header: "When", key: "when", width: 130, format: (v) => new Date(v as string).toLocaleString() },
          { header: "Subject", key: "primary", width: 180 },
          { header: "Detail", key: "secondary", width: 130 },
          { header: "Notes", key: "notes", width: 100 },
        ],
        rows: rows.map((r) => ({
          when: r.occurred_at, primary: r.primary, secondary: r.secondary ?? "",
          amount: r.amount, status: r.status, notes: r.notes ?? "",
        })),
      }],
    });
  };

  const tabs: { key: ActivityKind; label: string; icon: typeof ClipboardCheck }[] = [
    { key: "inspections", label: "Inspections", icon: ClipboardCheck },
    { key: "signatures", label: "Signatures", icon: FileSignature },
    { key: "expenses", label: "Expenses", icon: Receipt },
  ];

  return (
    <ReportCard icon={ClipboardCheck} title="Activity Logs" description="Inspections, signatures, and expenses with date filters.">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all touch-target ${
              kind === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      <DateRangePicker value={range} onChange={setRange} />
      <ReportExportButtons onExport={onExport} />
    </ReportCard>
  );
}

/* ---------------- Audit ---------------- */

function AuditReportsCard({
  organizationId, organizationName, isPlatformAdmin,
}: { organizationId: string; organizationName: string; isPlatformAdmin: boolean }) {
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [kind, setKind] = useState<AuditKind>("shift_ticket");
  const { toast } = useToast();

  const onExport = async (fmt: Format) => {
    const rows = await fetchAuditRows(kind, {
      organizationId: kind === "platform" ? undefined : organizationId,
      rangeStart: range.from, rangeEnd: range.to,
    });
    if (rows.length === 0) {
      toast({ title: "No data", description: "No audit entries in this range." });
      return;
    }
    const baseName = `audit_${kind}_${range.label.replace(/\s+/g, "_")}`;
    const headers = ["When", "Actor", "Action", "Target", "Detail"];

    if (fmt === "csv") {
      return downloadCsv(baseName, headers,
        rows.map((r) => [new Date(r.occurred_at).toLocaleString(), r.actor, r.action, r.target ?? "", r.detail ?? ""]),
      );
    }
    if (fmt === "excel") {
      return downloadExcel(baseName, [{
        name: "Audit",
        columns: [
          { header: "When", key: "when", width: 22 },
          { header: "Actor", key: "actor", width: 18 },
          { header: "Action", key: "action", width: 24 },
          { header: "Target", key: "target", width: 22 },
          { header: "Detail", key: "detail", width: 50 },
        ],
        rows: rows.map((r) => ({
          when: new Date(r.occurred_at).toLocaleString(),
          actor: r.actor, action: r.action, target: r.target ?? "", detail: r.detail ?? "",
        })),
      }]);
    }
    return downloadTablePdf({
      title: "Audit Log",
      subtitle: `${kind.replace("_", " ")} · ${range.label}`,
      organizationName,
      filenameBase: baseName,
      landscape: true,
      sections: [{
        columns: [
          { header: "When", key: "when", width: 130, format: (v) => new Date(v as string).toLocaleString() },
          { header: "Actor", key: "actor", width: 110 },
          { header: "Action", key: "action", width: 140 },
          { header: "Target", key: "target", width: 120 },
          { header: "Detail", key: "detail", width: 220 },
        ],
        rows: rows.map((r) => ({
          when: r.occurred_at, actor: r.actor, action: r.action, target: r.target, detail: r.detail,
        })),
      }],
    });
  };

  const tabs: { key: AuditKind; label: string; admin: "org" | "platform" }[] = [
    { key: "shift_ticket", label: "Shift Ticket", admin: "org" },
    { key: "payroll_adjustment", label: "Payroll Adj", admin: "org" },
    { key: "platform", label: "Platform", admin: "platform" },
  ];

  const visibleTabs = tabs.filter((t) => t.admin === "org" || isPlatformAdmin);

  return (
    <ReportCard icon={ScrollText} title="Audit Logs" description="Field changes, payroll adjustments, and platform actions.">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all touch-target ${
              kind === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DateRangePicker value={range} onChange={setRange} />
      <ReportExportButtons onExport={onExport} />
    </ReportCard>
  );
}

/* ---------------- Incident Cost ---------------- */

function IncidentCostCard({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [range, setRange] = useState<DateRange>(defaultRange());
  const { toast } = useToast();

  const onExport = async (fmt: Format) => {
    const rows = await fetchIncidentCostRows(organizationId, range.from, range.to);
    if (rows.length === 0) {
      toast({ title: "No data", description: "No incidents found." });
      return;
    }
    const baseName = `incident_cost_${range.label.replace(/\s+/g, "_")}`;
    const headers = ["Incident", "Status", "Expense Count", "Total Expenses"];

    if (fmt === "csv") {
      return downloadCsv(baseName, headers, rows.map((r) => [r.incidentName, r.status, r.expenseCount, r.totalExpenses]));
    }
    if (fmt === "excel") {
      return downloadExcel(baseName, [{
        name: "Incident Cost",
        columns: [
          { header: "Incident", key: "name", width: 30 },
          { header: "Status", key: "status", width: 14 },
          { header: "Expense Count", key: "count", width: 14, format: "int" },
          { header: "Total Expenses", key: "total", width: 18, format: "currency" },
        ],
        rows: rows.map((r) => ({ name: r.incidentName, status: r.status, count: r.expenseCount, total: r.totalExpenses })),
      }]);
    }
    return downloadTablePdf({
      title: "Incident Cost Report",
      subtitle: range.label,
      organizationName,
      filenameBase: baseName,
      sections: [{
        columns: [
          { header: "Incident", key: "name", width: 240 },
          { header: "Status", key: "status", width: 90 },
          { header: "Expenses", key: "count", width: 70, align: "right" },
          { header: "Total", key: "total", width: 100, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
        ],
        rows: rows.map((r) => ({ name: r.incidentName, status: r.status, count: r.expenseCount, total: r.totalExpenses })),
      }],
    });
  };

  return (
    <ReportCard icon={Flame} title="Incident Cost" description="Per-incident expense totals.">
      <DateRangePicker value={range} onChange={setRange} />
      <ReportExportButtons onExport={onExport} />
    </ReportCard>
  );
}

/* ---------------- Crew Roster ---------------- */

function CrewRosterCard({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const { toast } = useToast();

  const onExport = async (fmt: Format) => {
    const rows = await fetchCrewRoster(organizationId);
    if (rows.length === 0) {
      toast({ title: "No data", description: "No crew members yet." });
      return;
    }
    const baseName = "crew_roster";
    const headers = ["Name", "Role", "Phone", "Active", "Qualifications"];

    if (fmt === "csv") {
      return downloadCsv(baseName, headers,
        rows.map((r) => [r.name, r.role, r.phone ?? "", r.active ? "Yes" : "No", r.qualifications.join(", ")]),
      );
    }
    if (fmt === "excel") {
      return downloadExcel(baseName, [{
        name: "Crew Roster",
        columns: [
          { header: "Name", key: "name", width: 24 },
          { header: "Role", key: "role", width: 18 },
          { header: "Phone", key: "phone", width: 16 },
          { header: "Active", key: "active", width: 10 },
          { header: "Qualifications", key: "quals", width: 40 },
        ],
        rows: rows.map((r) => ({
          name: r.name, role: r.role, phone: r.phone ?? "",
          active: r.active ? "Yes" : "No", quals: r.qualifications.join(", "),
        })),
      }]);
    }
    return downloadTablePdf({
      title: "Crew Roster",
      organizationName,
      filenameBase: baseName,
      sections: [{
        columns: [
          { header: "Name", key: "name", width: 140 },
          { header: "Role", key: "role", width: 100 },
          { header: "Phone", key: "phone", width: 90 },
          { header: "Active", key: "active", width: 50 },
          { header: "Qualifications", key: "quals", width: 160 },
        ],
        rows: rows.map((r) => ({
          name: r.name, role: r.role, phone: r.phone ?? "",
          active: r.active ? "Yes" : "No", quals: r.qualifications.join(", "),
        })),
      }],
    });
  };

  return (
    <ReportCard icon={Users} title="Crew Roster" description="All crew with roles, contact, and qualifications.">
      <ReportExportButtons onExport={onExport} />
    </ReportCard>
  );
}

/* ---------------- Shared shell ---------------- */

function ReportCard({
  icon: Icon, title, description, children,
}: { icon: typeof DollarSign; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-4 card-shadow space-y-3">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
