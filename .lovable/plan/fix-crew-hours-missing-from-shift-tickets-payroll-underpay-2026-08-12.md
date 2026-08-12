# Fix: crew hours missing from shift tickets (payroll underpay)

Deep dive done. The tickets are right; the crew rows on them are not.

## What the data actually shows

Hihanni Sica isn't two trucks — it's **DL62 with two parts**:

- **Part 1** (RO E-1 / E-1.1), 7/19–7/20 — crew: Les Madsen, Arnie Phipps, Bryce Dougherty
- **Part 2** (RO SD-RBA-000076), 7/21–7/26 — crew: Dustin, Kaylee, Stacey

War Bonnet is **DL62 Part 1** (RO E-1), 7/27–8/3, all three of them on every ticket. So the Dustin/Kaylee/Stacey window is 7/21–7/26 plus 7/27–8/3 = **14 shifts**, not the 12 the paystub showed.

Every ticket has a correct equipment line. On **9 of those 14**, the crew rows saved blank with 0 hours:

| Date | Fire / part | Equipment line | Crew rows |
|---|---|---|---|
| 7/21 | Hihanni P2 | 06:00–18:00 (12.0) | 11.5 hrs — good |
| 7/22, 7/23, 7/24, 7/25, 7/26 | Hihanni P2 | 07:00–19:00 (12.0) | blank, 0 |
| 7/27 | War Bonnet | 07:00–22:30 (15.5) | 15.5 — good |
| 7/28 | War Bonnet | 09:00–19:00 (10.0, tire change) | blank, 0 |
| 7/29 | War Bonnet | 07:00–19:00 (12.0) | 12.0 — good |
| 7/30, 7/31, 8/1 | War Bonnet | 07:00–19:00 (12.0) | blank, 0 |
| 8/2, 8/3 | War Bonnet | 07:00–19:00 (12.0) | 11.5 — good |

Two knock-on date errors, both on blank tickets: the **7/24** ticket's crew rows are dated 7/25 (so 7/24 and 7/25 collapse into one day and a shift disappears), and Stacey's row on the **7/31** ticket is dated **8/31**.

**Cause:** crew times are only written when someone taps "Apply to All Crew" in the ticket form. Skip that tap and the ticket still saves and finalizes with empty crew rows — and the blank rows keep the form's default date instead of the shift date, which is exactly where 7/25 and 8/31 came from. Payroll reads only crew rows, so Kaylee was paid 62 hrs instead of about 163.5. Dustin's total looked plausible only because his $1,000/day flat rate still pays on a blank day — but he lost a whole shift to the 7/24 date collapse.

**Roster is already complete.** Checked every ticket individually: Dustin, Kaylee, and Stacey are each listed on all 6 Hihanni Part 2 tickets (7/21–7/26) and all 8 War Bonnet tickets (7/27–8/3) — 14 for 14, nobody missing. The only thing wrong on those rows is the blank times (and the two bad dates). So no one needs to be added; they need their hours filled in.


## The fix

**1. Close the hole in the form**
- On save, any crew row with a name but no times inherits the equipment line's date, start, stop, and the standard 30-min lunch split. No extra tap needed.
- Crew row dates are always forced to the equipment date, so a row can never carry today's date.
- Finalizing with any 0-hour crew row prompts a clear confirm ("3 crew members have no hours — finalize anyway?").

**2. Repair Hihanni Part 2 + War Bonnet**
- Backfill crew times on the 9 blank tickets from each ticket's own equipment line, minus the 30-min lunch — same as the tickets that were filled in correctly.
- Fix the 7/24 crew dates and Stacey's 8/31 row.

**3. Audit the rest of the season**
- Report every other Dry Lightning ticket where the equipment line has hours but the crew rows are 0, so we know how far back the underpay goes before more payroll gets marked paid.

**4. Re-run the paystubs**
- Regenerate the Dustin / Kaylee / Stacey document for both fires. Kaylee lands around 163.5 hrs across 14 shifts — roughly $6,200 gross instead of $2,087, with overtime kicking in on both full weeks.

## Confirm before I touch data

- Standard rule for the blank days: equipment window minus a 30-min lunch, so 07:00–19:00 pays 11.5 hrs per person, and the 7/28 tire-change day (09:00–19:00) pays 9.5. Tell me if any of those days ran differently.
- 7/27 (15.5) and 7/29 (12.0) were entered with no lunch deduction. I'll leave those exactly as they are unless you want them made consistent.

## Technical notes

- Auto-fill runs on submit in `src/components/shift-tickets/ShiftTicketForm.tsx`, reusing `splitForLunch` / `computeHours` from `src/services/shift-tickets.ts` — identical math to what `CrewSyncCard` already does, so nothing about hour calculation changes.
- Finalize guard added where status is set to `final`.
- Data repair is a one-time update to `shift_tickets.personnel_entries` on the 9 affected tickets; equipment entries are untouched.
- `src/lib/payroll.ts` is unchanged — it picks up corrected hours automatically.
