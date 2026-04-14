

# Dashboard Polish: Match Sizes, Fix 404, Tighten Needs

## Issues to fix

### 1. Shift Ticket 404 (critical)
The quick action navigates to `/shift-tickets/new` which doesn't exist. Shift tickets require incident + truck context. The `ShiftTicketQuickAccess` dialog already handles this picker flow and is already rendered in Dashboard with `showTickets` state. Fix: change the onClick to `() => setShowTickets(true)` instead of navigating.

### 2. Quick Actions sizing -- match stat cards
Currently quick actions use `aspect-square` with large icon circles, making them taller than the stat cards. Remove the aspect-square constraint, reduce padding, and match the compact feel of the stat cards above. Same glass-tile, similar height.

### 3. Needs List -- keep it visible without scrolling
On a 393x587 viewport, the needs list is below the fold. Two options:
- **Tighten everything above** so needs list fits on screen
- **Remove the needs list section header overhead** and make it more compact

I'll do both: reduce quick action height (no more aspect-square), tighten section gaps, and make needs list rows more compact. This should get at least the first 2-3 needs items visible without scrolling on a standard phone.

## Changes (all in `src/pages/Dashboard.tsx`)

1. **Fix Shift Ticket onClick**: `() => setShowTickets(true)`
2. **QuickAction component**: Remove `aspect-square`, reduce padding from `p-4` to `p-3`, shrink icon container from `h-10 w-10` to `h-8 w-8`, match stat card text size
3. **Reduce outer spacing**: `space-y-4` to `space-y-3`
4. **Needs list rows**: tighter padding (`py-3` to `py-2`), smaller icon container

## File changed
- `src/pages/Dashboard.tsx`

