

# Show gross + net pay per crew member on Payroll list

## What changes
On the Payroll page crew list (the main rows shown in your screenshot), each row currently shows just one dollar amount on the right. Update each row to show **both Gross and Net pay**, stacked on the right side.

## Layout (per row)

```text
Justin Richardson                                    Gross  $8000.00
Engine Boss                                            Net  $6480.00
                                                  8 shifts · 97.0 hrs
```

- **Gross** on top (current bold number, slightly smaller label "Gross" prefix in muted text)
- **Net** directly below in green (matches the existing Net Pay summary card color)
- Existing meta line (shifts/hours/OT) stays as the third line

For hourly crew with deductions, Net = Gross − deductions. For day-rate crew (Justin, Dustin) with no withholding profile configured, Net will equal Gross — in that case only show one line to avoid redundant clutter.

## File touched
- `src/pages/Payroll.tsx` — update the crew row JSX in the list rendering. Read `line.netPay` and `line.deductions` (already computed by `src/lib/payroll.ts`); render the second line only when `netPay` exists and differs from `grossPay`.

## No other changes
- No engine/math changes — `calcDeductions` and `netPay` are already on each `CrewPayrollLine`.
- Paystub modal and PDF unchanged.
- Summary cards at top unchanged.

