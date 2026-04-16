

# Fix Shift Ticket Date Mismatch

## Problem

The two 79 Fire shift tickets have personnel dates that are 1 day ahead of equipment dates:

- Ticket 8046 (4/12): equipment date = 4/12, but personnel dates = 4/13. Should all be 4/12.
- Ticket 4809 (4/13): equipment date = 4/13, but personnel dates = 4/14. Should all be 4/13.

The crew assignments are correct (8046 = Dustin/Brandon/Kenna, 4809 = Dustin/Bobby/Nevaeh).

**Root cause**: The `duplicateShiftTicket` function advances both equipment and personnel dates by +1 day. But the original ticket already had mismatched dates (personnel was 1 day ahead from initial creation), so the mismatch carried forward.

## What will be fixed

### 1. Fix existing data (database update)
Update the two tickets to correct personnel dates:
- Ticket `8046eae0...`: set all personnel_entries dates to `2026-04-12`
- Ticket `4809a412...`: set all personnel_entries dates to `2026-04-13`

### 2. Fix the duplicate logic in code
In `src/services/shift-tickets.ts` `duplicateShiftTicket()`: ensure personnel entry dates match the equipment entry dates after duplication (use the equipment date as the source of truth rather than independently advancing both).

### 3. Fix the create logic
In `src/pages/ShiftTicketCreate.tsx`: the equipment entry date isn't being set during initialization (it uses the default `getLocalDateString()` from `emptyEquipmentEntry()`), while personnel entries also use `getLocalDateString()`. These should always match. Add explicit equipment entry initialization with the same date.

## Files changed

| File | Change |
|------|--------|
| DB migration | Update personnel dates on the two affected tickets |
| `src/services/shift-tickets.ts` | Fix `duplicateShiftTicket` to sync personnel dates to equipment date |
| `src/pages/ShiftTicketCreate.tsx` | Ensure initial equipment + personnel dates match |

