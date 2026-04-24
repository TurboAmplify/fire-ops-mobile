

# Admin Reports — Build Plan

## Output formats
Three buttons per report: **PDF** (jsPDF, print-ready), **CSV** (raw data, accountant-friendly), **Excel** (formatted .xlsx via SheetJS — column widths, bold headers, currency/number formatting, frozen header row).

Add `xlsx` (SheetJS) dependency for Excel export.

## Where it lives
1. **New hub**: `/admin/reports` — central reports landing page with all report types
2. **Page-level buttons**: Export buttons added to existing Activity Logs (`AdminLogs.tsx`), Audit page (`SuperAdminAudit.tsx`), and Payroll page (`Payroll.tsx`)
3. **More page**: New "Reports" card in the Admin section linking to `/admin/reports`

## Report types

### 1. Activity Logs Report
Three filter tabs (Inspections / Signatures / Expenses) — same data as `AdminLogs.tsx` but exportable. Includes date range filter.

### 2. Audit Logs Report (platform admins only)
- **Shift Ticket Audit** (org-scoped, admin) — all field changes with actor/timestamp
- **Payroll Adjustment Audit** (org-scoped, admin) — created/deleted adjustments with actor
- **Platform Admin Audit** (platform admin only) — cross-org actions

### 3. Payroll Reports (the big one)
Each export comes in **PDF / CSV / Excel** flavors. Date range = presets + custom.

**Scope dropdown:**
- All crew (org-wide)
- Single crew member
- All incidents
- Single incident
- Combination: crew × incident

**Report variants** (matches your "all three buttons" choice):
- **Summary** — one row per crew member: reg hrs, OT hrs, H&W, gross, deductions, net
- **Detail** — summary + per-shift breakdown (date, incident, ticket #, hrs)
- **Paystubs** — one PDF per crew member (uses existing `generatePaystubPdf`) bundled into a single multi-page PDF, plus cover summary

### 4. Bonus reports (filling in gaps)
- **Incident Cost Report** — labor + expenses per incident, exportable
- **Crew Roster Report** — active crew, roles, qualifications, contact info
- **Expense Report** — date-range filtered expenses by category/incident

## Date range UX
Reusable `<DateRangePicker>` component:
- Presets: This Week / Last Week / This Month / Last Month / Pay Period (Mon–Sun current week) / Last 30 Days / Year to Date / All Time
- "Custom..." opens two shadcn Calendar pickers in a Popover
- Mobile-first: full-width chips for presets, large touch targets

## Files

**New:**
- `src/pages/AdminReports.tsx` — central hub with cards for each report type
- `src/components/reports/DateRangePicker.tsx` — reusable preset + custom range
- `src/components/reports/ReportExportButtons.tsx` — PDF / CSV / Excel button trio
- `src/components/reports/ScopePicker.tsx` — All / Single crew + All / Single incident
- `src/services/reports/payroll-report.ts` — aggregates payroll data, calls existing `src/lib/payroll.ts`
- `src/services/reports/activity-report.ts` — fetches inspections/signatures/expenses with date filter
- `src/services/reports/audit-report.ts` — fetches shift_ticket_audit + payroll_adjustment_audit + platform_admin_audit
- `src/services/reports/incident-report.ts` — labor cost + expenses per incident
- `src/services/reports/exporters/csv.ts` — generic CSV writer
- `src/services/reports/exporters/excel.ts` — SheetJS-based formatted xlsx writer (bold headers, frozen row, column widths, $ format)
- `src/services/reports/exporters/pdf-payroll.ts` — payroll summary/detail PDF
- `src/services/reports/exporters/pdf-activity.ts` — activity log PDF
- `src/services/reports/exporters/pdf-audit.ts` — audit log PDF
- `src/services/reports/exporters/pdf-paystubs-bundle.ts` — multi-page paystub bundle (reuses existing `generatePaystubPdf`)
- `src/services/reports/exporters/share.ts` — single helper that triggers download on web AND opens iOS/Android share sheet via Capacitor when available (so PDFs/CSVs work on the mobile app)

**Edited:**
- `src/App.tsx` — add `/admin/reports` route gated by `AdminGate`
- `src/pages/More.tsx` — add "Reports" card in Admin section
- `src/pages/AdminLogs.tsx` — add `<ReportExportButtons>` for the active tab
- `src/pages/SuperAdminAudit.tsx` — add export buttons
- `src/pages/Payroll.tsx` — add export buttons in admin view (top of page, mobile-first)

**Dependencies added:**
- `xlsx` (SheetJS) for formatted Excel export

## Mobile-first / app store requirements
- All buttons ≥44px touch targets, full-width on narrow screens, side-by-side on wider
- Loading spinner during file generation (large payroll reports can take a beat)
- Empty states ("No data in this date range") with clear messaging
- Error toasts via `sonner` if generation fails — never silent
- Capacitor share sheet integration: on iOS/Android the file opens the native "Save to Files" / share UI; on web it triggers a normal download. Single helper, no platform-specific code in components.
- All admin-gated via `useOrganization().isAdmin` (existing pattern); platform-only audit hidden behind `usePlatformAdmin`
- Zero changes to data tables, RLS, or existing logic — pure read-only export layer
- Zero new RLS policies needed (all reads use existing admin RLS)

## What stays unchanged
- All existing tables, RLS, triggers, functions
- `src/lib/payroll.ts` aggregation logic
- `src/components/payroll/generatePaystubPdf.ts` — reused as-is
- `src/components/shift-tickets/generateOF297Pdf.ts` — untouched
- Crew users see nothing new (entirely admin-gated)

## Risk surface
Read-only export feature, no schema changes, no auth changes. The only risk is bundle size from `xlsx` (~400KB gzipped) — mitigated by lazy-loading the exporters with dynamic `import()` so the chunk only ships when an admin actually exports.

