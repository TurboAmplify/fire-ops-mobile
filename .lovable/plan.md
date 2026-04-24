

# Daily Crew widget: refresh on ticket save + draft/complete badges

## Why it's not updating
The Daily Crew section is **not** filtering out drafts — drafts are included. The real bug: when you save a shift ticket, the `["shift-tickets", ...]` cache is invalidated but the `["incident-daily-crew", incidentId]` cache is not. So the widget keeps showing stale numbers until you hard-reload the page.

## Two small fixes

### 1. Invalidate Daily Crew cache when a ticket changes
In `src/hooks/useShiftTickets.ts`, every mutation (`useCreateShiftTicket`, `useUpdateShiftTicket`, `useDeleteShiftTicket`, `useDuplicateShiftTicket`) needs to also invalidate `["incident-daily-crew"]`. Easiest approach: invalidate by prefix so we don't have to thread `incidentId` through every call site.

```ts
qc.invalidateQueries({ queryKey: ["incident-daily-crew"] });
```

After this, every save / duplicate / delete refreshes the Daily Crew tile immediately. Drafts that were previously logged but invisible will now appear (they were always being counted — just stale).

### 2. Status indicator on each crew row in Daily Crew
Right now Daily Crew only shows hours and trucks — the user can't tell whether a number reflects a signed/finalized ticket or a draft still being edited. We'll surface that.

**Schema change in the hook (`src/hooks/useIncidentDailyCrew.ts`):**
Each `DailyCrewCell` gets a new field tracking the worst (least-finalized) status across the tickets that contributed hours to that cell:

```ts
interface DailyCrewCell {
  hours: number;
  trucks: string[];
  status: "draft" | "awaiting_supervisor" | "complete";
  ticketIds: string[];   // optional, for future tap-through
}
```

Status derivation per ticket (matches `ShiftTicketSection`'s `StatusBadge`):
- `complete` → has supervisor signature
- `awaiting_supervisor` → has contractor rep signature only
- `draft` → neither

When a cell aggregates hours from multiple tickets, we keep the *least finalized* status — so if any contributing ticket is still a draft, the cell shows draft. This is the conservative, accurate signal the user wants ("don't tell me it's complete when there's still a draft").

**UI change in `src/components/incidents/IncidentDailyCrewGrid.tsx`:**
Inside each crew row in the per-day list, add a small pill next to the hours number (or under the truck name) using the same color tokens as `ShiftTicketSection`:
- **Draft** — muted gray
- **Awaiting Supervisor** — amber
- **Complete** — green

```text
Brandon Aldrich              13.0
DL31 · Engine Boss   [Draft] hrs
```

The day-selector pills at the top stay numeric (total hours), since mixing statuses across multiple crew there would be noisy.

### What stays the same
- Drafts are still counted. Hours from a draft ticket are real work logged — hiding them would be worse than showing them with a label.
- No schema/migration changes.
- No changes to `ShiftTicketSection`, payroll, or anything else.

## Files touched
- `src/hooks/useShiftTickets.ts` — add `["incident-daily-crew"]` invalidation to the 4 mutation hooks.
- `src/hooks/useIncidentDailyCrew.ts` — derive per-ticket status, propagate worst-case status into each cell, expose in the returned shape.
- `src/components/incidents/IncidentDailyCrewGrid.tsx` — render a status pill on each crew row.

## Result
1. Save a draft on Coyote Flats → Daily Crew updates immediately and shows the new hours with a **Draft** pill.
2. Crew rep signs → next save flips the pill to **Awaiting Supervisor** (amber).
3. Supervisor signs → pill turns **Complete** (green).
4. If a crew member has hours across 2 tickets that day and one is still a draft, the row shows **Draft** until both are signed.

