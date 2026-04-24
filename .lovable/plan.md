

# Two payroll fixes

## Issue 1 — John Webber shows hours but $0 / "0 shifts" on Ashby

### Root cause
John Webber has **no row in `crew_compensation`** (the table that stores per-employee `hourly_rate`, `hw_rate`, `pay_method`, `daily_rate`). When the payroll aggregator can't find a comp row, it falls back to `hourlyRate = 0` and `hwRate = 0`. Result: his hours show correctly (74.5 hrs across Ashby), but every dollar amount is $0 and the breakdown looks broken.

This isn't a math bug — it's missing data. Six other crew on the same org all have rates filled in; John just never got set up.

### Fix (two parts)
1. **Data**: Insert a `crew_compensation` row for John with the org's standard defaults — $28.73 base + $4.93 H&W (hourly), matching the other six crew members. After this his Ashby pay populates immediately.
2. **UI guard** in `src/pages/Payroll.tsx`: When a crew row has hours but `hourlyRate === 0` AND `dailyRate === 0` (i.e. no comp row), show a small inline warning chip: **"No pay rate set — set in Crew → [name]"**. Prevents this from silently showing $0 again for any future crew member who gets added without a comp row.

---

## Issue 2 — Admin payroll adjustments (extra hours / bonus pay)

### Your proposal vs. alternatives
Your instinct is correct — adjusting payroll **without touching shift tickets** is the right call. Shift tickets are the legal/billable record (they get signed, exported as OF-297 PDFs, and submitted to the agency). They must reflect actual hours worked, period. Compensation is a separate concern.

I considered three approaches and recommend the one closest to yours:

| Approach | Verdict |
|---|---|
| Edit shift ticket hours | **No** — corrupts the legal record |
| Use the old `shifts` feature | **No** — overcomplicated, you already deprecated it |
| **Payroll adjustments table** (your idea) | **Yes** — clean separation, fully auditable |

### How it works
A new admin-only table `payroll_adjustments` stores discrete adjustment line-items, each tied to a crew member + optional incident, with a date, hours OR flat dollar amount, reason note, and who created it / when. The aggregator pulls these in and adds them on top of shift-ticket-derived pay.

### What admins see
On any crew member's expanded payroll card, a new **"Adjustments"** section between "By Fire" and the deductions block:

```text
─── Adjustments ───────────────────────────────
+ 2.0 hrs · Coyote Flats · 3/20/26
  "Owner approved extra hr/shift for Coyote Flats"  [×]
+ 2.0 hrs · Coyote Flats · 3/21/26
  "Owner approved extra hr/shift for Coyote Flats"  [×]
                              Adjustment Total  +$229.84
                                                [+ Add Adjustment]
```

The **"+ Add Adjustment"** button opens a bottom sheet:
- **Crew member** (pre-filled to current row)
- **Incident** (optional dropdown — "Coyote Flats" etc.; can be left blank for org-wide)
- **Date** (defaults to today; for date-range bonuses pick any representative date)
- **Type**: Extra Hours (multiplied by base rate, no OT) **or** Flat Amount (dollars)
- **Amount / Hours** (numeric input)
- **Reason** (required text — surfaces in audit log and paystub)

### Behavior rules
- Adjustments are **always paid at base rate, no OT, no H&W** — they're discretionary additions, not part of the 40-hr OT bucket
- Adjustments fold into Gross → flow through deductions and Net naturally
- Adjustments are **excluded from "hours worked"** displays so the OF-297 audit trail stays clean — they show only in a separate "Adjustments" line
- Each adjustment shows on the **paystub PDF** as its own line item with the reason text, so the crew member sees exactly what they're being paid extra for and why
- **Audit**: every create/delete writes to a `payroll_adjustment_audit` table (actor, timestamp, before/after) — never editable in place; to change one, delete and re-add
- **Visibility**: hourly + daily crew both supported (for daily crew, "Extra Hours" doesn't make sense, so the form forces "Flat Amount" for them)

### Files / data touched
**Backend**
- New table `payroll_adjustments` (org-scoped, admin-only RLS via `is_org_admin`)
- New table `payroll_adjustment_audit` (append-only, admin-readable)
- Triggers to write audit rows on insert/delete

**Frontend**
- `src/lib/payroll.ts` — extend `CrewPayrollLine` with `adjustments` array + `adjustmentTotal`; aggregator adds them to gross
- `src/pages/Payroll.tsx` — render Adjustments section + "Add Adjustment" button
- `src/components/payroll/AdjustmentSheet.tsx` (new) — the bottom-sheet form
- `src/components/payroll/Paystub.tsx` + `generatePaystubPdf.ts` — render adjustments as their own line items with reason
- `src/hooks/usePayrollAdjustments.ts` (new) — fetch + mutate

### Plus the John Webber data fix
- Insert one `crew_compensation` row for John (`0f683191...`) using org defaults so his existing hours start paying out immediately

## Open question
For the Coyote Flats use case ("extra hour or two per shift"), do you want the form to let you **batch-add** an adjustment across a date range in one tap (e.g. "+1.5 hrs/day for Brandon, Dustin, Nevaeh, 3/19–3/24 on Coyote Flats" → creates 18 individual adjustment rows automatically)? Or do you prefer one adjustment at a time so each is reviewed individually? Either is easy; the batch version is faster but a tiny bit more form complexity.

