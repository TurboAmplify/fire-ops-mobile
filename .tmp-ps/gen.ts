import { readFileSync, writeFileSync } from "fs";
import { aggregateCrewPayroll, DEFAULT_ORG_PAYROLL } from "/dev-server/src/lib/payroll";
import { downloadPaystubsBundle } from "/dev-server/.tmp-ps/bundle";

const d = JSON.parse(readFileSync("/tmp/ps/data.json", "utf8"));

const tickets = d.tickets.map((t: any) => ({
  id: t.id,
  personnel_entries: t.personnel_entries,
  incident_id: t.incident_id,
  incident_name: t.incident_name,
}));

const crew = d.crew.map((c: any) => ({ id: c.id, name: c.name, role: c.role }));
const crewIds = new Set(crew.map((c: any) => c.id));

const compMap = new Map<string, any>();
(d.comp ?? []).forEach((c: any) => compMap.set(c.crew_member_id, c));

const roleDefaults = new Map<string, any>();
(d.roleDefaults ?? []).forEach((r: any) =>
  roleDefaults.set((r.role ?? "").trim(), {
    role: r.role,
    pay_method: r.pay_method === "daily" ? "daily" : "hourly",
    hourly_rate: r.hourly_rate,
    hw_rate: r.hw_rate,
    daily_rate: r.daily_rate,
  })
);

const profiles = new Map<string, any>();
(d.comp ?? []).forEach((r: any) => profiles.set(r.crew_member_id, r));

const s = d.settings;
const orgDefaults = s
  ? {
      federal_pct: Number(s.federal_pct),
      social_security_pct: Number(s.social_security_pct),
      medicare_pct: Number(s.medicare_pct),
      state_pct: Number(s.state_pct),
      state_enabled: !!s.state_enabled,
      extra_withholding_default: Number(s.extra_withholding_default),
      workers_comp_pct: Number(s.workers_comp_pct ?? DEFAULT_ORG_PAYROLL.workers_comp_pct),
      factoring_pct: Number(s.factoring_pct ?? DEFAULT_ORG_PAYROLL.factoring_pct),
      factoring_enabled: s.factoring_enabled ?? DEFAULT_ORG_PAYROLL.factoring_enabled,
    }
  : DEFAULT_ORG_PAYROLL;

const HIHANNI = "50f79c2c-4f70-4000-9a49-8be417926ef0";
const WARBONNET = "9e645769-e523-495e-965d-4d041d2d09e4";
const incidentNames = new Map<string, string>([
  [HIHANNI, "Hihanni Sica"],
  [WARBONNET, "War Bonnet"],
]);

const lines = aggregateCrewPayroll({
  shiftTickets: tickets as any,
  crewMembers: crew,
  compensation: compMap,
  roleDefaults,
  rangeStart: null,
  rangeEnd: null,
  incidentFilter: [HIHANNI, WARBONNET],
  adjustments: (d.adjustments ?? []).filter((a: any) => crewIds.has(a.crew_member_id)),
  incidentNames,
  withholdings: { profiles, orgDefaults },
} as any);

console.log(
  lines.map((l: any) => ({
    name: l.name,
    hrs: l.totalHours,
    ot: l.overtimeHours,
    shifts: l.shiftCount,
    gross: l.grossPay,
    net: l.netPay,
    byInc: l.byIncident.map((i: any) => `${i.incidentName}:${i.shiftCount}/${i.totalHours}h/$${i.grossPay}`),
  }))
);

const buf: Buffer = (await downloadPaystubsBundle({
  lines,
  organizationName: d.org.name,
  periodLabel: "Hihanni Sica + War Bonnet",
  filenameBase: "paystubs",
})) as any;
writeFileSync("/mnt/documents/paystubs_hihanni-sica_war-bonnet.pdf", buf);
console.log("written", buf.length);
