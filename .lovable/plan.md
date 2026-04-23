

# Coyote Flats backfill + Engine Boss daily-rate support

Two pieces: (1) add daily-rate-per-shift as a payment method for crew, and (2) load the Coyote Flats data using it.

## Part 1 — Daily rate as a payment method (schema + engine + UI)

### Schema (new migration)
Add to `crew_compensation`:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `pay_method` | text | `'hourly'` | `'hourly'` or `'daily'` |
| `daily_rate` | numeric | `null` | Flat $ per shift when `pay_method = 'daily'` |

No data loss — existing rows stay on `'hourly'`.

### Payroll engine (`src/lib/payroll.ts`)
Extend `CompensationLite` with `pay_method` and `daily_rate`. In `aggregateCrewPayroll`:

- **Hourly (existing behavior, unchanged)**: regular × rate, OT 1.5× over 40, H&W on first 40.
- **Daily**: count distinct shift dates per crew member in range; gross = `shifts × daily_rate`. No OT, no H&W. Hours still tracked for display, but pay is flat.

`CrewPayrollLine` gets two new optional fields: `payMethod: 'hourly' | 'daily'` and `shiftCount` (only set on daily). Hourly fields stay zero on daily rows so existing UI doesn't break — daily rows just show the flat amount and shift count instead of the breakdown.

### UI changes

**Crew member form (`CrewMemberForm.tsx`)**
- Role becomes a dropdown: Engine Boss, Crew Boss, FF1, FF2, Engineer, Other (free-text). The exact list lives in one constant so we add roles in one place later.
- New "Payment Method" segmented control under the rates section: **Hourly** | **Daily**.
  - Hourly selected → show Hourly Rate + H&W Rate (today's UI).
  - Daily selected → show single "Daily Rate ($)" input, hide H&W.
- Admin-only, mobile-first (full-width 44px+ controls, inline switch — no modal).

**Payroll page (`Payroll.tsx`)**
- Daily-rate crew rows show: `N shifts × $1,000 = $X,XXX` instead of the regular/OT/H&W breakdown.
- Compliance banner unchanged. Deductions card still works (federal/SS/Medicare apply to gross regardless of method).
- Paystub for daily-rate employees lists each shift date instead of an hours table.

### What this protects
- Mixed contractor model preserved: org admins choose per-employee.
- No change to Brandon/Nevaeh/Sheldon (FF2 hourly).
- App Store-ready: pure additive change, no removed features, mobile-first, no new permissions.

## Part 2 — Coyote Flats backfill (data load)

Same plan as before, with two updates:

1. **Justin Richardson is the EB on DL 62.** Confirmed in the roster.
2. Both Engine Bosses (Dustin Aldrich + Justin Richardson) get `pay_method = 'daily'`, `daily_rate = 1000.00` set on their `crew_compensation` rows before the tickets are inserted.

### Data load steps
1. Seed `org_payroll_settings` for Dry Lightning (10% / 6.2% / 1.45% / 0% state).
2. Upsert `crew_compensation` for **Dustin Aldrich**: `pay_method='daily'`, `daily_rate=1000`.
3. Upsert `crew_compensation` for **Justin Richardson**: `pay_method='daily'`, `daily_rate=1000`.
4. Assign **DL 31** to the Coyote Flats incident (`incident_trucks` insert).
5. Crew rosters on `incident_truck_crew`:
   - DL 31: Dustin (EB), Brandon (FF2), Nevaeh (FF2), Sheldon (FF2)
   - DL 62: Justin (EB)
6. Insert **4 shift tickets**, status `final`:

| # | Date | Truck | Hrs | Personnel |
|---|---|---|---|---|
| 1 | 2026-03-19 | DL 31 | 12 | Dustin (EB), Brandon, Nevaeh |
| 2 | 2026-03-20 | DL 31 | 14 | Dustin, Brandon, Nevaeh |
| 3 | 2026-03-22 | DL 62 | 12 | Justin (EB) |
| 4 | 2026-03-22 | DL 31 | 13 | Dustin, Brandon, Sheldon |

### What you'll see in Payroll → By Crew → All Time
- **Dustin Aldrich (EB)** — 3 shifts × $1,000 = **$3,000 gross**
- **Justin Richardson (EB)** — 1 shift × $1,000 = **$1,000 gross**
- **Brandon Aldrich (FF2)** — 39 hrs × $28.73 + H&W = $1,312.62 gross
- **Nevaeh Smith (FF2)** — 26 hrs × $28.73 + H&W = $875.08 gross
- **Sheldon Sundstrom (FF2)** — 13 hrs × $28.73 + H&W = $437.54 gross

By Fire → Coyote Flats shows the same numbers grouped under the incident. Each row expands to deductions + net pay, and "View Paystub" / "Download PDF" works.

## Files touched

**Migration (1)**: add 2 columns to `crew_compensation`.

**Edited code (3)**:
- `src/lib/payroll.ts` — daily-method branch in aggregator; new fields on `CompensationLite` and `CrewPayrollLine`.
- `src/components/crew/CrewMemberForm.tsx` — role dropdown, payment method toggle, conditional rate inputs.
- `src/pages/Payroll.tsx` — daily-rate row rendering (shift count × rate).
- `src/components/payroll/Paystub.tsx` — daily-rate variant (shift list instead of hours table).

**Data inserts (separate, after schema is live)**:
- `org_payroll_settings`: 1 row
- `crew_compensation`: 2 upserts (Dustin, Justin)
- `incident_trucks`: 1 row (DL 31 → Coyote Flats)
- `incident_truck_crew`: 5 rows
- `shift_tickets`: 4 rows

**No changes** to bottom nav, access control, OT/H&W hourly logic, withholding engine, or anything outside the payroll/crew surface.

## Resource-order completeness reminder
Agreement number is still missing for Coyote Flats. Not blocking — but adding the season's master agreement number to the Dry Lightning org or this incident will pre-fill it on every future ticket.

