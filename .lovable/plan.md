# Fix: crew hours missing from shift tickets (payroll underpay)

You were right — the shift tickets themselves are correct. The crew rows on those tickets are not.

## What's actually wrong

Every one of the 16 Hihanni Sica / War Bonnet tickets has a correct equipment line (mostly 07:00–19:00 = 12.0 hrs). But on **9 of the 16 tickets**, the crew rows were saved with blank start/stop and 0 hours:

| Ticket date | Equipment line | Crew rows |
|---|---|---|
| 7/19, 7/20, 7/21 | 16.0 / 12.5 / 12.0 | filled |
| 7/22, 7/23, 7/24, 7/25, 7/26 | 12.0 each | blank, 0 hrs |
| 7/27 | 15.5 | filled |
| 7/28 | 10.0 | blank, 0 hrs |
| 7/29 | 12.0 | filled |
| 7/30, 7/31, 8/1 | 12.0 each | blank, 0 hrs |
| 8/2, 8/3 | 12.0 each | filled |

Payroll reads only the crew rows, so Kaylee got paid for 62 hrs instead of roughly 175. Dustin's total looked fine only because he's on a $1,000/day flat rate, which still pays on a blank day.

**Cause:** crew times are only written when someone taps "Apply to All Crew" in the ticket form. If that tap is skipped, the ticket saves and finalizes with empty crew rows and nothing warns anybody. The same gap also explains the bad dates — blank crew rows keep the form's default date (today) instead of the shift date, which is why the 7/24 ticket shows crew dated 7/25, the 7/28 ticket shows 7/29, and Stacey has a stray 8/31 row.

## The fix

**1. Stop it from happening again**
- Auto-apply the equipment times to crew rows on save: any crew row with a name but no start/stop inherits the equipment line's date, start, stop, and lunch split. No extra tap required.
- Block/warn on finalize: if any crew row still has 0 hours, show a clear confirm ("3 crew members have no hours — finalize anyway?").
- Always force crew row dates to match the equipment date, so a crew row can never carry today's date.

**2. Repair the existing data (Hihanni Sica + War Bonnet)**
- Backfill the 9 tickets: apply each ticket's equipment start/stop to its crew rows, minus the standard 30-min lunch, matching how the filled tickets were entered.
- Correct the crew dates on the 7/24 and 7/28 tickets and remove Stacey's stray 8/31 row.

**3. Audit the rest of the season**
- List every other Dry Lightning ticket where the equipment line has hours but crew rows are 0, so we can see how far back the underpay goes before more payroll is marked paid.

**4. Re-run the paystubs**
- Regenerate the Dustin / Kaylee / Stacey document for both fires with corrected hours.

## Confirm before I touch data

- Standard shift = equipment window minus a 30-min lunch (so a 07:00–19:00 line becomes 11.5 paid hrs per person), matching your filled-in tickets. Say the word if any of those days were different.
- The 7/28 ticket is 09:00–19:00 (10.0) with the remark "had to get tire changed on truck" — crew gets 9.5 hrs that day under the same rule.

## Technical notes

- Auto-fill logic lives in `src/components/shift-tickets/ShiftTicketForm.tsx` on submit, reusing `splitForLunch` / `computeHours` from `src/services/shift-tickets.ts` — the exact same math `CrewSyncCard` already runs, so nothing about how hours are calculated changes.
- Finalize guard added where status is set to `final`.
- Data repair is a one-time update to `shift_tickets.personnel_entries` for the 9 affected ticket ids; equipment entries are not touched.
- Payroll aggregation in `src/lib/payroll.ts` is unchanged — it will pick up the corrected hours automatically.
