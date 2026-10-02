# Read-only 2026 workers' comp payroll control report — Dry Lightning

Strictly read-only. No changes to the app, records, files or paystubs. The report is delivered as text in chat.

## Scope
- Every 2026 shift ticket (draft and final) for Dry Lightning, through the latest completed payroll (Sep 22).
- Every app payment record (marked-paid entry) for the same period.
- No workers' comp exclusions applied. Every employee is listed in one population.
- Extra detail for July through September, which the older workbook doesn't cover.

## Report sections

1. **One line per employee per payroll period and incident**
   - Columns: employee, incident, first and last shift date, number of shifts, hours, gross pay, matching payment record IDs with amount and status, and "supported by shift tickets" (yes, partial or no).
   - Rolls are split by incident so each fire's payroll can be traced separately.

2. **Record status for each payment record**
   - **Current:** the one record that counts.
   - **Superseded:** an Aug 12 "all fires" $0 record replaced by the Aug 23 per-fire close-out record for the same dates.
   - **Duplicate:** for example Chase's three identical $5,027.59 records for Aug 5–18.
   - **Corrected:** the amount was edited after entry (Chad's 0% federal, Orban's 9/22 half day).
   - **Typo period:** records dated Apr 22, 2024 to May 6, 2026.
   - **Placeholder:** a $0 record.
   - Each worked day is counted once, whatever the number of overlapping records.

3. **Work on shift tickets with no current paystub record**, especially July through September
   - For example: Landon and David Aug 18–31; Orban Aug 18–Sep 7; Dustin Aug 24–Sep 11; Owen and Gabriel Sep 1–11; Kaylee and Stacey Aug 25–Sep 7; Chad Aug 26–27 and Sep 8–9; Arnie and Sheldon Sep 8–11; Arnie and Bryce Jul 19–20; Bobby and Nevaeh Aug 29.
   - Stubs generated in chat but never recorded in the app are labeled separately.

4. **Payment records with no ticket support**
   - For example, records whose period contains no worked days, or amounts above what the tickets compute.

5. **Data problems that affect totals**
   - Same-day duplicate tickets (8/27 hours double-counted for Kaylee and Stacey).
   - Rows with no name, 0-hour days, draft-only tickets, and the "Les Muse" / "Les Madison" rows.

6. **Totals**
   - Gross pay per employee, split Jan–Jun and Jul–Sep.
   - Season total gross pay, also split into:
     - pay with a current paystub record
     - pay on tickets but not recorded
     - an adjusted total with the double-counted hours removed

## Technical details
- SELECT-only queries plus a temporary script in /tmp that reuses the app's existing payroll formula.
- Gross pay is computed per employee, per incident and per date range.
- Matching uses the payment record's period dates and incident.
- Pay is computed for whole weeks, and overtime is assigned to incidents the same way the app does it.
