

# Fix Shift Ticket Issues + Customizable Bottom Nav

## Issue 1: Dates still off by one day

The `useRecentShiftTickets` hook displays dates using `new Date(t.updated_at).toLocaleDateString()` which can shift dates due to UTC interpretation. The date from equipment/personnel entries (stored as `YYYY-MM-DD` strings) is also being parsed through `Date` which causes UTC-ahead shifts.

**Fix**: Display the raw `YYYY-MM-DD` string dates directly without converting through `new Date()`. For `updated_at` fallback, parse with timezone awareness using the same local-date pattern already in the project.

**Files**: `src/components/shift-tickets/ShiftTicketQuickAccess.tsx`

## Issue 2: Tapping a recent ticket goes to 404

Line 30-33 in `ShiftTicketQuickAccess.tsx` has a broken `handleTicketTap` -- it calls `navigate` twice, first to a malformed URL using `incident_truck_id` for both the incident and truck params, then to a non-existent `/shift-ticket/:id` route.

The problem: `shift_tickets` table has `incident_truck_id` but not `incident_id`. We need to look up the `incident_id` from the `incident_trucks` table.

**Fix**: Update the `useRecentShiftTickets` query to join `incident_trucks` to get `incident_id`. Then build the correct route: `/incidents/{incident_id}/trucks/{incident_truck_id}/shift-ticket/{ticket_id}`. Remove the duplicate navigate call.

**Files**: `src/hooks/useShiftTickets.ts`, `src/components/shift-tickets/ShiftTicketQuickAccess.tsx`

## Issue 3: Customizable bottom navigation bar

Add a "favorites" system where users pick which 3 middle tabs appear in the bottom nav (Home and More stay fixed at positions 1 and 5).

**How it works**:
- Store the user's chosen tabs in `localStorage` (no database change needed)
- Available options: Incidents, Payroll, Expenses, Shift Tickets, Crew, Fleet, Time, Needs List
- Default: Incidents, Payroll, Expenses (current behavior)
- Add a "Customize Nav Bar" option in Settings page that opens a picker
- Bottom nav reads from localStorage and renders the chosen tabs

**Files**:
- `src/components/BottomNav.tsx` -- read tab config from localStorage, render dynamic middle 3 tabs
- `src/pages/Settings.tsx` -- add "Customize Navigation" row
- New: `src/components/settings/NavBarCustomizer.tsx` -- picker dialog where user selects 3 favorites
- `src/pages/Dashboard.tsx` -- wire up Shift Tickets button to open the quick access dialog (already done), ensure it works as a nav target too

### What will NOT change
- No shift ticket form, save, signature, or PDF logic
- No database changes
- No routing changes
- All existing workflows preserved

