# Daily-Rate Paystub Breakdown (Engine Bosses)

## Goal
For crew paid on a flat daily rate ($1000/day for Engine Bosses), the paystub should display an hourly breakdown — Regular pay, H&W (on first 40 hrs/week), and Overtime (1.5×, >40 hrs/week Mon–Sun) — that always sums **exactly** to `shifts × daily_rate`. Gross pay, net pay, deductions, and totals do not change.

## Approach
**Back-solve the hourly base rate per week** so the breakdown always reconciles to the daily total.

For each Mon–Sun week worked:
- `shifts` = unique shift dates that week
- `reg_hrs` = min(totalHours, 40)
- `ot_hrs`  = max(totalHours − 40, 0)
- `hw_rate` = $4.93 (org default H&W)
- Target weekly gross = `shifts × 1000`

Solve for `base`:
```
shifts × 1000 = reg_hrs × (base + hw_rate) + ot_hrs × base × 1.5
base = (shifts × 1000 − reg_hrs × hw_rate) / (reg_hrs + 1.5 × ot_hrs)
```

Then derived values:
- `reg_pay = reg_hrs × base`
- `hw_pay  = reg_hrs × hw_rate`
- `ot_pay  = ot_hrs × base × 1.5`
- Sum = `shifts × 1000` exactly.

Aggregate across weeks for the paystub period: sum reg_hrs, ot_hrs, reg_pay, hw_pay, ot_pay. Gross stays `total_shifts × daily_rate`.

## Edge cases
- **No hours logged but shifts exist** (zero-hour daily ticket): fall back to current single "Daily Flat Rate" line — back-solve undefined.
- **Derived base ≤ 0** (would only happen if H&W alone exceeds daily): fall back to flat daily line, log a warning.
- **Hourly crew, mixed periods, adjustments, reimbursements**: untouched. Only `payMethod === "daily"` lines change presentation.

## Files to change
- `src/lib/payroll.ts` — in the `isDaily` branch (~line 614), instead of zeroing `regularPay/hwPay/overtimePay`, run the weekly back-solve and populate them. Gross still = `shifts × dailyRate`. Also populate `byIncident` reg/hw/ot proportionally (by shifts within incident × that week's derived rates), keeping each incident's gross at `incident_shifts × dailyRate`.
- `src/components/payroll/Paystub.tsx` — for daily method, render the hourly earnings table (Reg / H&W / OT rows) instead of the current single Daily row. Add a small footnote: "Daily flat rate of $X/shift. Hourly breakdown shown for reference; total guaranteed at daily rate."
- `src/components/payroll/generatePaystubPdf.ts` — mirror the same breakdown for the PDF.
- `src/services/reports/exporters/pdf-paystubs-bundle.ts` — same breakdown in the bundled PDF.

## What does NOT change
- `daily_rate` value ($1000), org default rates, withholding %s, deduction math.
- Hourly crew paystubs.
- Gross/net totals for daily crew (still `shifts × 1000`, minus deductions, plus reimbursements).
- Org settings UI, role default rates UI.

## Testing
1. Les (Engine Boss, $1000/day, daily method) on the State Severity incident with ~7 shifts: paystub should show Reg/H&W/OT lines summing to `7 × $1000 = $7,000`, OT correctly bucketed by Mon–Sun weeks.
2. Hourly crew member on same incident: paystub unchanged.
3. Daily crew with zero hours logged (just shift dates): falls back to flat daily line, gross still correct.
4. Multi-incident daily crew: per-incident breakdown lines still sum to total gross.
5. Reports → Payroll → bundled PDF export shows the breakdown across all daily-rate paystubs.
