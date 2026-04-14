

# Clean Up Shift Ticket Quick Access: One Per Truck + View History

## What's changing

The home screen of the ShiftTicketQuickAccess dialog currently shows the last 5 tickets as a flat list, which gets cluttered fast. Instead, show **one ticket per active truck** (the most recent), grouped by truck name, with a "View All Tickets" button that opens the full history.

## Changes

### 1. New query: `useLatestTicketPerTruck` in `useShiftTickets.ts`
- Query shift_tickets joined with incident_trucks and trucks
- Group by `incident_truck_id`, return only the most recent ticket per truck
- Use a raw query approach: fetch recent tickets (e.g. limit 50), then deduplicate client-side by `incident_truck_id`, keeping only the first (most recent) per truck
- Also fetch truck name via `incident_trucks(incident_id, trucks(name, unit_type))`

### 2. Update `ShiftTicketQuickAccess.tsx` home view
- Replace `useRecentShiftTickets(5)` with the new per-truck query
- Each card shows: **Truck Name** (primary), incident name + date (secondary), draft/final badge
- Add a new step `"history"` to the step state
- Add a **"View All Tickets"** button below the per-truck list that sets step to `"history"`

### 3. New step: `"history"` in ShiftTicketQuickAccess
- Shows a scrollable list of ALL recent shift tickets (use existing `useRecentShiftTickets` with a higher limit like 25)
- Each row: incident name, truck/equipment type, date, status
- Back button returns to home

```text
BEFORE:
┌ Shift Tickets ────────────────┐
│ [+ New Shift Ticket]          │
│ Recent Tickets                │
│  Ticket 1 - 4/10             │
│  Ticket 2 - 4/10             │
│  Ticket 3 - 4/9              │
│  Ticket 4 - 4/9              │
│  Ticket 5 - 4/8              │
└───────────────────────────────┘

AFTER:
┌ Shift Tickets ────────────────┐
│ [+ New Shift Ticket]          │
│ Latest by Truck               │
│  DL31 - Johnson Fire - 4/10  │
│  DL61 - Smith Fire - 4/10    │
│ [View All Tickets]            │
└───────────────────────────────┘

(tap "View All Tickets" →)
┌ All Tickets ──────────────────┐
│  DL31 - Johnson - 4/10 Draft │
│  DL31 - Johnson - 4/9  Final │
│  DL61 - Smith - 4/10   Draft │
│  DL61 - Smith - 4/9    Final │
│  ... more ...                 │
│ [Back]                        │
└───────────────────────────────┘
```

## Files changed
- `src/hooks/useShiftTickets.ts` -- add `useLatestTicketPerTruck` hook (fetches recent tickets with truck info, dedupes by incident_truck_id)
- `src/components/shift-tickets/ShiftTicketQuickAccess.tsx` -- use new hook for home view, add "history" step with full ticket list, add "View All Tickets" button

