---
name: Payroll module
description: Weekly payroll with per-employee rates, withholdings/deductions, paystub PDFs, super-admin gated
type: feature
---
# Rates & calculation
- Default base rate: $28.73/hr; default H&W: $4.93/hr
- `crew_compensation` table stores per-employee `hourly_rate` + `hw_rate` (admin-only RLS)
- Org `default_hw_rate`: $4.93
- Formula: reg_hrs (≤40/week) × (base + hw_rate) + ot_hrs × base × 1.5
- Monday is week start (`weekStartsOn: 1`); H&W only on first 40 hrs/week, never on OT
- OT computed per Mon–Sun week (even in Pay Period / All Time views)

# Access control
- Global kill-switch: `platform_settings.payroll_global_enabled` (super-admin only)
- Per-org toggle: `organizations.modules_enabled.payroll`
- Default for new contractor orgs: DISABLED — must be enabled by super admin
- Dry Lightning Wildland Firefighters LLC enabled by default
- Crew users never see payroll (admin-only via `<AdminGate>` + `<ModuleGate module="payroll">`)
- Payroll tab in bottom nav hidden when off OR user not admin

# Withholdings (simplified percentage-based — NOT IRS tax tables)
- `org_payroll_settings` table: federal/SS/Medicare/state %, state_enabled, extra_withholding_default
- `crew_compensation` extended with: filing_status, dependents_count, use_default_withholding,
  federal_pct_override, extra_withholding, state_pct_override, social_security_exempt,
  medicare_exempt, other_deductions, notes
- Defaults: Federal 10%, SS 6.2%, Medicare 1.45%, State 0%
- `calcDeductions()` in `src/lib/payroll.ts` — pure helper
- Compliance banner everywhere: "Estimated Withholding — Not Official Tax Calculation"

# Data flow
- Live-derived from `shift_tickets.personnel_entries` (no snapshot pay_runs table yet)
- Joined to `crew_members` by name (case-insensitive)
- Aggregation in `src/lib/payroll.ts` (pure helpers, tests-friendly)
- Page: `src/pages/Payroll.tsx` — This Week / Pay Period / All Time + By Crew / By Fire
- Paystub PDF via jsPDF in `src/components/payroll/generatePaystubPdf.ts`
- Paystub on-screen modal: `src/components/payroll/Paystub.tsx`
- Super-admin toggles: `src/components/super-admin/PayrollAccessToggle.tsx`
