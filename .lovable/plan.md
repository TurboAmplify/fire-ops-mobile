# Read-only follow-up: remaining missing paystubs for workers' comp covered workers

This is read-only. Nothing in the app, its records, files or paystubs will be changed, and no PDFs will be generated. The results come back as text in chat.

## Who is included
- Every 2026 Dry Lightning employee except Dustin Aldrich, Kenna Aldrich, Kaylee Aldrich, Brandon Aldrich and Sheldon Sundstrom. Those five are left out completely.

## Already covered by PDFs you located (treated as paid, not missing)
- Landon Heisler and David Allen Morgan: through 8/31
- John Orban, Owen Conklin, Gabriel Beck and Stacey Flute: corrected stubs through 9/5
- Chad Boyd: corrected stub for 8/26–8/27
- Bobby Bales and Nevaeh Smith: corrected stubs through 8/29
- Also counted as covered: the stubs made in this chat after 9/5. These are Chad 9/13–16, Owen and Gabriel 9/1–14, and John Orban 9/10–22. Each one is labeled so you can override it.

## Steps
1. Pull every 2026 shift-ticket crew entry for the included employees. Count each worked day once and flag any same-day duplicate tickets.
2. Subtract the covered periods above and the app's existing payment records. Whatever work is left is a missing paystub.
3. Check Arnie Phipps and Bryce Dougherty on Hihanni Sica, Jul 19–20, on their own. Report them as missing unless a payment record or PDF covers those days.
4. Compute each missing stub with the app's own payroll formula:
   - hourly or daily pay method
   - regular time and overtime counted by Monday-to-Sunday week
   - health and welfare only on the first 40 hours each week
   - each person's federal % setting, Social Security 6.2% and Medicare 1.45%
   - any recorded adjustments

## What you'll get
For each missing stub:
- employee
- exact shift dates
- incident
- hours per day and total
- role and pay method
- gross pay
- federal % setting and the federal amount
- Social Security and Medicare amounts
- total deductions
- net pay

Results are split into two groups:
- **A. Gaps on or before Sep 5** inside periods the located PDFs don't cover, such as Arnie and Bryce on Jul 19–20, and Orban, Arnie and Bryce in late August.
- **B. Work from Sep 6 on** with no stub. For example: Arnie on DL31 from 9/6, Stacey 9/6–7, Gabriel and Owen after 9/14, and Chad 9/8–9 if he's on those tickets.

The report ends with totals and with anything that needs your decision: blank-name rows, 0-hour days and same-day duplicates.

## Technical details
- SELECT-only queries on shift_tickets.personnel_entries, crew_members, crew_compensation, org_payroll_settings, org_role_default_rates, payroll_payments and payroll_adjustments.
- A temporary script in /tmp imports the aggregation and calcDeductions functions from src/lib/payroll.ts, so the figures match the app exactly. Nothing is written to the project or the database.
