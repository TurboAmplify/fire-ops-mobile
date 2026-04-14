

# Shift Ticket Quick Access + Collapsible Truck Sections

## What you're asking for
1. **Inside the truck card**: Make sections collapsible to reduce scrolling, but keep them accessible
2. **On the Dashboard**: Add a "Shift Tickets" quick-access button that opens a dialog/popup where you can pick incident + truck, see recent tickets, duplicate, or create new -- without navigating through the full incident drill-down

## Plan

### Part 1: Collapsible truck sections (IncidentTruckList.tsx)

Wrap these sections inside the expanded truck card with collapsible headers:
- **Truck Details** (photo, specs) -- collapsed by default
- **Resource Orders** -- collapsed by default  
- **Agreements** -- collapsed by default
- **Crew** -- collapsed by default
- **Shifts** -- collapsed by default
- **Shift Tickets** -- **expanded by default** (most used, should be visible first)

Each section gets a small header bar with a chevron toggle. Uses the existing Radix `Collapsible` component already in the project. The shift tickets section stays at the bottom but is the only one open by default, so it's immediately visible without scrolling past all the other content.

Status changer stays always visible (it's small and important).

### Part 2: Dashboard shift ticket popup (Dashboard.tsx)

Add a "Shift Tickets" button to the Operations quick-actions list on the home screen. When tapped, it opens a full-screen dialog (not a page navigation) that:

1. **Shows recent shift tickets** (last 5 across all incidents) with incident name, truck, date, and status. Tapping one navigates directly to edit it.
2. **Shows a "New Ticket" flow**: pick active incident -> pick assigned truck -> navigates to the create page. Two taps instead of six.
3. **Duplicate button** on recent tickets, same as existing behavior.

This requires a new hook `useRecentShiftTickets()` that queries the shift_tickets table ordered by `updated_at` desc, limit 5.

### Files changed
- `src/components/incidents/IncidentTruckList.tsx` -- wrap each section in Collapsible, shift tickets expanded by default
- `src/pages/Dashboard.tsx` -- add Shift Tickets quick action that opens a dialog
- `src/hooks/useShiftTickets.ts` -- add `useRecentShiftTickets()` hook
- New: `src/components/shift-tickets/ShiftTicketQuickAccess.tsx` -- the popup dialog component

### What will NOT change
- No shift ticket form, save, signature, or PDF logic changes
- No routing changes (existing routes stay the same)
- No database changes
- The full drill-down path (Incident -> Truck -> Shift Tickets) still works exactly as before

