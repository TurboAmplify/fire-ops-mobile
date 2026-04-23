

# Payroll v2 — Withholdings, Paystubs, Access Control

## What's already in place (preserved)
- `useAppMode()` reads `organizations.modules_enabled` JSONB → already overrides per-org module flags including `payroll`.
- `<AdminGate>` + `<ModuleGate module="payroll">` already wrap the `/payroll` route.
- Nav bar already hides Payroll tab when `payroll` module is off OR user is not admin.
- `aggregateCrewPayroll()` in `src/lib/payroll.ts` correctly handles weekly OT, H&W on first 40, Mon–Sun weeks. We extend it, not replace it.
- `platform_settings` table exists (already used for app background) — perfect for the global kill-switch.

## 1. Access control (Super Admin → Org Admin → Crew)

**Global kill-switch (Super Admin only)**
- New row in `platform_settings`: `key = 'payroll_global_enabled'`, `value = { enabled: true }` (default on).
- Add a "Payroll System" toggle to `SuperAdmin.tsx` page.
- `useAppMode()` extends to read this value. If global off → `modules.payroll = false` for everyone, no exceptions.

**Per-organization toggle (Super Admin only)**
- Already supported via `organizations.modules_enabled.payroll`. No schema change.
- Add a "Payroll" toggle in `SuperAdminOrgDetail.tsx` that writes `modules_enabled = jsonb_set(modules_enabled, '{payroll}', 'true'/'false')`.
- One-time data migration: set `modules_enabled.payroll = true` for **Dry Lightning Wildland Firefighters LLC**, leave others empty (which falls back to `MODE_CONFIG.contractor.payroll = true`).
  - **Important:** since the default for contractors is currently `true`, we'll also flip the contractor default to `false` so all *other* contractor orgs are disabled by default (per your spec).

**Final visibility rules** (already enforced by `useVisibleSelectedTabs` + `ModuleGate` + `AdminGate`):
- Crew users: never see payroll, anywhere.
- Org admins: see payroll only if module is on for their org AND global switch is on.
- Super admin: sees the toggles, sees payroll inside any org they're a member of.

## 2. Org-level withholding defaults

New table `org_payroll_settings`:

| Column | Default |
|---|---|
| `organization_id` (PK) | — |
| `federal_pct` | `10.00` |
| `social_security_pct` | `6.20` |
| `medicare_pct` | `1.45` |
| `state_pct` | `0.00` |
| `state_enabled` | `false` |
| `extra_withholding_default` | `0.00` |

RLS: admin read/write only, scoped by org. Edited from a new section on the existing **Payroll Settings** screen (admin-only).

## 3. Per-employee withholding profile

Extend `crew_compensation` (already exists, already admin-only RLS). Add columns:

| Column | Type | Default |
|---|---|---|
| `filing_status` | text | `'single'` (`single` \| `married_jointly`) |
| `dependents_count` | int | `0` |
| `use_default_withholding` | bool | `true` |
| `federal_pct_override` | numeric | `null` |
| `extra_withholding` | numeric | `0` |
| `state_pct_override` | numeric | `null` |
| `social_security_exempt` | bool | `false` |
| `medicare_exempt` | bool | `false` |
| `other_deductions` | numeric | `0` |
| `notes` | text | `null` |

UI: extend the existing crew member edit screen (`CrewMemberForm.tsx`) with a collapsible **"Payroll Profile"** card, admin-only.

## 4. Calculation engine (extends `src/lib/payroll.ts`)

New helper `calcDeductions({ grossPay, regularPay, overtimePay, profile, orgDefaults })` returns:

```text
{ federal, socialSecurity, medicare, state, other, total, net }
```

Rules:
- Each tax = `(applicable wages) × percentage`. SS and Medicare apply to gross unless exempt.
- `federal_pct` resolves: profile override → org default.
- `extra_withholding` is a flat dollar add to federal.
- All amounts rounded to cents at display time, never during accumulation.

`aggregateCrewPayroll()` gets a new optional `withholdings` arg — when present, each `CrewPayrollLine` gains a `deductions` block and `netPay`.

## 5. Payroll page UI (mobile-first, extends existing screen)

Existing tabs (This Week / Pay Period / All Time) and toggle (By Crew / By Fire) stay.

When a crew row is expanded, add three stacked cards below the existing Gross Pay block:

```text
┌─ Deductions ──────────────────┐
│  Federal (10%)        −$184.74│
│  Social Security (6.2%) −$114.54│
│  Medicare (1.45%)      −$26.79│
│  State (0%)             $0.00 │
│  Other                  $0.00 │
│  Extra withholding      $0.00 │
│  ───────────────────────────  │
│  Total Deductions    −$326.07 │
└───────────────────────────────┘

┌─ Net Pay ─────────────────────┐
│           $1,521.13           │
└───────────────────────────────┘

[ View Paystub ]  [ Download PDF ]
```

Compliance banner pinned to the top of the page:
> "Estimated Withholding — Not Official Tax Calculation"

## 6. Paystub (PDF + on-screen)

New `src/components/payroll/Paystub.tsx` — clean printable view with:
- Employer (org), employee name, role, pay period, pay date
- Hours table: regular hrs × rate, OT hrs × 1.5x rate
- Gross → itemized deductions → net
- Per-incident hours summary if pay covers multiple fires
- Same disclaimer at bottom

PDF generation: reuse the existing `jspdf` + `html2canvas` pattern from `generateOF297Pdf.ts`. New file: `src/components/payroll/generatePaystubPdf.ts`. "Download PDF" triggers it; "View Paystub" opens a full-screen modal with the same component + a Print button that calls `window.print()`.

## 7. Reporting

The existing By Crew / By Fire toggle + incident filter + date ranges already cover: employee, incident, fire, pay period, all incidents combined. We add:

- **Org-wide totals card** at the top of "All Time" view: total gross, total deductions, total net for the org.
- **Crew filter dropdown** (single-select) to drill into one person across all fires.
- The existing By-Fire mode gets a deductions row per crew under each incident.

## 8. Data integrity

For v1, payroll is still **live-derived** from shift tickets + the *current* crew_compensation row (matches existing behavior — keeps complexity down, avoids a snapshot table).

Guard rail: when a profile is edited, show a warning toast: *"Withholding changes apply to this and all future payroll views. Past PDFs you've already downloaded are unchanged."*

(If you later need locked historical pay runs, we add a `pay_runs` snapshot table in a follow-up — the engine is already split out so it'll plug in cleanly.)

## Technical changes summary

**New migration (schema only):**
- New table `org_payroll_settings` + RLS
- Add 10 columns to `crew_compensation`

**New data migration (one-time):**
- `INSERT INTO platform_settings(key, value) VALUES ('payroll_global_enabled', '{"enabled":true}')`
- `UPDATE organizations SET modules_enabled = jsonb_set(modules_enabled, '{payroll}', 'true') WHERE name = 'Dry Lightning Wildland Firefighters LLC'`
- Flip `MODE_CONFIG.contractor.payroll` default to `false` in `src/lib/app-mode.ts`

**New files:**
- `src/hooks/useOrgPayrollSettings.ts`
- `src/components/payroll/WithholdingProfileForm.tsx`
- `src/components/payroll/Paystub.tsx`
- `src/components/payroll/generatePaystubPdf.ts`
- `src/components/payroll/PayrollSettingsCard.tsx`
- `src/components/super-admin/PayrollAccessToggle.tsx`

**Edited files:**
- `src/lib/payroll.ts` — add `calcDeductions` + extend `CrewPayrollLine` with `deductions` & `netPay`
- `src/lib/app-mode.ts` — read global kill-switch; flip contractor default
- `src/pages/Payroll.tsx` — deductions/net/paystub UI, compliance banner, crew filter, org totals
- `src/pages/SuperAdmin.tsx` — global toggle
- `src/pages/SuperAdminOrgDetail.tsx` — per-org payroll toggle
- `src/components/crew/CrewMemberForm.tsx` — withholding profile section (admin only)

No changes to bottom nav code (already filters on module + adminOnly correctly). No changes to existing OT / H&W / weekly logic.

