## Problem

Payroll today only works in three ranges: This Week, Pay Period (2 weeks), and All Time. When a crew's assignment spans more than two weeks (e.g. Stick Fire), there is no single view that captures the whole incident — so you can't mark them paid for the fire, and the paystub is labeled by week instead of by incident.

## What to build

**1. A fourth view: "By Fire"**

Add an `incident` option to the Payroll view tabs. When selected:
- You pick the fire (reuses the existing incident selector).
- The date range is computed automatically from that crew's actual activity on that fire — earliest to latest shift-ticket date, extended to include any payroll adjustments tied to the incident (so the 7/07 drive-time day is included).
- The header shows `Stick Fire` with the resolved span underneath (e.g. `Jul 5 – Jul 7, 2026`), instead of "Mon - Sun".
- Week navigation arrows and the "jump to week" sheet are hidden in this mode.

**2. Mark Paid works per incident**

Mark Paid currently only appears for Week/Pay Period. In By Fire mode it becomes available using the incident's resolved start/end dates as the payment period, with the net pay amount and paystub delivery preference stored the same way as today. Because paid records are keyed on exact start/end dates, an incident payment won't collide with weekly payments.

The paid label reads "Marked 7/28/26 · Stick Fire (Jul 5 – Jul 7)".

**3. Paystub reflects the incident**

The paystub PDF gains an optional incident label. In By Fire mode the header shows:
- `PAY PERIOD: Jul 5 – Jul 7, 2026`
- a new line `INCIDENT: Stick Fire`
- filename becomes `Paystub-ChaseAlexander-StickFire.pdf`

In Week/Pay Period mode nothing changes.

## Technical notes

- `src/pages/Payroll.tsx`: extend `ViewRange` to `"week" | "period" | "incident" | "all"`; derive `rangeStart`/`rangeEnd` for the incident case from `normalizedTickets` + `adjustments` filtered by `incidentFilter`; gate the week nav UI on view mode; force `incidentFilter !== "all"` when the incident tab is chosen (default to the most recent incident with hours).
- `src/components/payroll/generatePaystubPdf.ts`: add optional `incidentName` arg, render the extra line, adjust filename.
- `src/hooks/usePayrollPayments.ts` and `payroll_payments`: no schema change — existing `period_start`/`period_end` columns hold the incident span.
- No changes to `src/lib/payroll.ts` calculation logic.

## What to test

- Payroll → By Fire → Stick Fire shows Chase, Sheldon, John with all their Stick Fire days (5 days spanning two weeks) plus the 7/07 drive-time adjustments.
- Mark Paid works there and shows the fire name; Undo removes it.
- Downloaded paystub shows the incident name and full span.
- This Week / Pay Period / All Time behave exactly as before.
