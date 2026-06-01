## Goal

When sending **Red Cards** from a new message thread, the user should first pick which **truck/resource** the cards are for. The crew list then shows the people assigned to that specific truck (auto-selected if only one truck is on the incident). The message body already auto-appends a truck + crew summary on send — that part stays.

Right now the assigned tab pools everyone across every truck on the incident and shows a flat list, which is why DL62's 3 crew aren't surfacing as "the DL62 crew."

## Data check (incident `9b9ca1aa…`)

- 1 incident truck: **DL62** with **3 active crew** assigned.
- So after this change: Resource picker auto-selects DL62, crew list shows those 3.

## Changes

**`src/services/red-cards.ts`**
- Extend `CrewWithRedCard` with `incident_truck_id: string | null` (already has `truck_name`).
- Populate `incident_truck_id` from `incident_truck_crew.incident_truck_id` in `listAssignedCrewWithRedCards`.
- Add a small helper `listIncidentTrucksForPicker(incidentId)` returning `{ incident_truck_id, truck_name, crew_count }[]` so the picker can render quickly without extra round-trips.

**`src/components/messages/NewThreadSheet.tsx`**
- Add state: `trucks: { incident_truck_id, truck_name, crew_count }[]`, `selectedTruckId: string | null`.
- When `purpose === "red_cards"` opens, load trucks. If exactly one truck → auto-select it. If none → show empty-state hint.
- Insert a **Resource** row above the Assigned/All toggle:
  - Single truck: render as a read-only chip ("Resource: DL62 · 3 crew").
  - Multiple trucks: render a compact native `<select>` (mobile-friendly) listing each `Truck name · N crew`.
  - Hidden entirely when `scope === "all"` (org-wide fallback).
- `visibleCrew` (assigned scope): filter to `c.incident_truck_id === selectedTruckId`.
- Update the Assigned button label from `Assigned (N)` to `Assigned to truck (N)` where N reflects the selected truck's crew count, not the pooled total.
- Reset `selectedIds` when `selectedTruckId` changes (avoids stale picks from a previously-viewed truck).
- Disable Send when `scope === "assigned"` and no truck selected.

**Body summary (already in place)**: groups picked crew by `truck_name`, so the existing append logic stays untouched and will read naturally now that selections come from one truck.

## Out of scope

- No backend / RLS / migration changes.
- No changes to org-wide "All crew" tab behavior.
- No new attachment types or PDF format changes.

## What to test

1. Open incident `9b9ca1aa…` → Messages → New → Purpose: Red cards.
   - Resource shows **DL62 · 3 crew** (auto-selected).
   - Crew list shows those 3 (greyed out if no card on file).
2. Select 1–3 members → Send → recipient message body contains `DL62 (N):` followed by names.
3. On an incident with 2+ trucks: dropdown appears, switching trucks updates the crew list and clears prior selections.
4. Switch to "All crew" tab → resource picker hides, full org list still works.
