# Read-only 2026 payroll control audit — Dry Lightning

Strictly read-only: no code, schema, data, file, PDF or payment changes. Output is structured text in chat only.

## What gets reported

1. **Expected payroll population (from shift tickets)**
   - Every non-deleted 2026 shift ticket for the org, with personnel entries matched to crew members by name.
   - Grouped per employee into "rolls": consecutive worked dates, split at any gap of 1+ days.
   - For each roll: employee, incident(s), period start/end, shift dates, ticket count, hours, gross pay (using the same payroll formula as the app: hourly + H&W up to 40 hrs/week, overtime at 1.5x, daily rates for Engine Bosses, adjustments applied).
   - Flags: blank/unmatched operator names, zero-hour entries, the same person on two tickets on the same date, draft vs. signed tickets, duplicate incidents (Route 7, Snake Berry, Ash Pole).

2. **Recorded payroll (payroll_payments)**
   - Every paid record: employee, period, incident, amount, how the stub was sent, date marked paid, notes (corrections such as Chad 0% federal and Orban's Zintkala half-day).

3. **Reconciliation per employee**
   - Matched: the roll is fully covered by paid records.
   - Superseded/overlapping: more than one record covers the same dates (for example a v1 and v2 stub, or per-incident legs plus a combined run). The record that is current is named.
   - Corrected: the amount was changed after the record was created (per notes).
   - **True missing**: worked dates with no paid record. Landon Aug 18–31 is expected here; Owen and Gabriel Sep 1–14 too, unless they were marked paid later.
   - Amount variances: recorded vs. computed gross (Justin $21,000 vs $20,000, Les $56,200 vs $55,000, David's $2,000 advance).

4. **Workers' comp split**
   - Two sections: covered employees and excluded employees (Dustin, Kenna, Kaylee, Brandon Aldrich, Sheldon Sundstrom). Excluded payroll is still listed in full.
   - Subtotals for gross pay and recorded pay in each section.

5. **Limitations stated explicitly**
   - Paystub PDFs generated in chat are not stored as app records, so "paystub exists" can only be inferred from paid records.
   - Name-based matching, and any days credited by hand outside shift tickets.

## Technical details
- SELECT-only queries on shift_tickets (personnel_entries jsonb), incident_trucks/incidents, crew_members, crew_compensation, org_role_default_rates, payroll_adjustments, payroll_payments, filtered to org 2ffa93de-506d-4aa7-a53e-a3a04d9626be and to 2026 dates.
- Gross pay is recomputed in a temporary /tmp script that calls the app's existing `aggregateCrewPayroll` without changing it.
