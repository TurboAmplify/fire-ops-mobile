# Verify the YTD payroll tax number

## What's likely going on

The $47,147.91 figure I gave was **total 941 liability** — that number mixes two very different things:

| Piece | Amount | Who actually pays it |
|---|---|---|
| Federal income tax withheld | ~$17,043 | The employee — deducted from their gross pay |
| Social Security + Medicare withheld (6.2% + 1.45%) | ~$15,053 | The employee — deducted from their gross pay |
| Employer FICA match (6.2% + 1.45%) | ~$15,053 | **The company — real extra cost** |
| Total remitted to IRS | ~$47,148 | Company writes the check, but only 1/3 is company expense |

Only the **employer match (~$15,053)** is money the company loses on top of wages. The other ~$32,095 already came out of crew paychecks — it was never company profit. So payroll tax is not eating half the profit; it's the gross wages (~$196,765) that are the large number, and those are already counted as cost in the P&L.

Separately, workers comp is set at 16% (~$31,482 YTD) and was **not** included in the $47k — that one is a genuine company cost.

This explanation is based on the rate settings I confirmed (Federal 11%, SS 6.2%, Medicare 1.45%, State off, Workers Comp 16%). The gross-wage total itself came from an ad-hoc aggregation, not from the app's payroll engine, so it should be re-verified before you rely on it for filing.

## Plan

1. **Re-verify gross YTD** by running the app's own payroll aggregation (`src/lib/payroll.ts`, same code the Payroll page and paystubs use) across all 2026 shift tickets, including manual adjustments and advances — instead of the one-off query I ran. Reconcile against the sum of issued paystubs.
2. **Build a YTD Payroll Tax Liability report** in Reports:
   - Split clearly into **Withheld from employees** vs **Employer-paid (company cost)** vs **Total remitted**.
   - Rows: Federal income tax, Social Security (ee/er), Medicare (ee/er), State (currently off), Workers Comp shown separately as insurance, not tax.
   - Breakdown by quarter (Q1–Q4) for 941 filing, plus a per-employee detail table.
   - Honors per-employee overrides (e.g. John Orban's 0% federal) rather than a flat percentage.
3. **Tie it into P&L language** — add a note on the report that only employer-paid amounts are incremental cost above gross wages, so the number can't be misread as a profit drain again.
4. PDF + CSV export using the existing report exporters, mobile-first layout matching the other reports.

## Technical notes

- New service `src/services/reports/payroll-tax-report.ts`, reusing `fetchPayrollReport` so numbers tie exactly to the Payroll Summary and paystubs.
- Quarter bucketing off shift-ticket personnel entry dates (same date source as `pl-report.ts`).
- Admin-gated, behind the existing payroll module gate.
