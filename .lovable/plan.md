## 1. Ticket date labels — show weekday + numeric date

**File:** `src/components/incidents/IncidentTicketsTab.tsx`

Replace `fmtDate()` so every ticket shows `Mon 05/14/26` style instead of "Today / Yesterday / N days ago":

- Build the label from the shift date itself: `<short weekday> <MM/DD/YY>`
- Use `toLocaleDateString(undefined, { weekday: "short" })` for the abbreviation
- Drop the relative-date branches entirely (no more "Today", "Yesterday", "X days ago")
- Keep the existing `TODAY` / `RECENT` section headers — those still group correctly using the raw date compare, no logic change needed there

Result on the card: `Type 6` (title) + `Wed 05/14/26` (sub-line).

## 2. Truck/resource filter visibility

The filter chip strip already exists, but only renders when `trucks.length > 1`. The current Ash Pole incident only has one truck, which is why you don't see it. Two small improvements:

- When there are 2+ trucks, also show the same filter chip strip in the **TODAY** section header area so it's obvious (currently it sits above TODAY but can be missed) — add a subtle "Filter:" label so users know what the chips do.
- When only one truck exists, show a tiny muted line: `Showing tickets for <truck name>` so users understand there's nothing to filter yet.

No data model changes.

## 3. Make the Crew tab edit-capable (without breaking shift-driven totals)

**Current state**
- The Crew tab (`IncidentDailyCrewGrid`) is **derived/read-only** — it aggregates hours from submitted shift tickets per day. It has no concept of "assigned crew."
- Truck ↔ crew assignments already exist via `incident_truck_crew` table, surfaced today only inside each truck's detail page (`TruckCrewSection` + `useIncidentTruckCrew` / `useAssignCrew` / `useReleaseCrew`).
- Users intuitively go to the Crew tab to manage crew, find nothing editable, and get stuck.

**Proposed change — additive, no schema work**

Add a new top section inside the Crew tab called **"Assigned Crew by Truck"** that sits *above* the existing Daily Crew (hours) grid. The existing grid stays exactly as-is so reporting/totals are untouched.

```text
┌─ Crew tab ─────────────────────────────┐
│ ASSIGNED CREW                          │  ← NEW
│  ▸ Truck A (3)            [+ Add]      │
│      • Jane Doe — Boss      [Release]  │
│      • John Roe — Operator  [Release]  │
│  ▸ Truck B (2)            [+ Add]      │
│      • ...                             │
│                                        │
│ DAILY CREW (hours from tickets)        │  ← existing, unchanged
│  [date strip + per-day rows]           │
└────────────────────────────────────────┘
```

**New component:** `src/components/incidents/IncidentCrewAssignmentsSection.tsx`
- Lists every truck on the incident
- For each truck, reuses the existing `useIncidentTruckCrew(incidentTruckId)` hook to read current assignments
- "+ Add" opens the same bottom-sheet picker used in `TruckCrewSection` (fed by `useAvailableCrewMembers`) and calls `useAssignCrew`
- "Release" calls `useReleaseCrew`
- Collapsible per truck (expanded by default if ≤2 trucks)

**Mounting:** render it at the top of `IncidentDailyCrewGrid`'s parent in `IncidentDetail.tsx`, inside the existing `<TabsContent value="crew">`:

```tsx
<TabsContent value="crew">
  <IncidentCrewAssignmentsSection incidentId={incident.id} organizationId={incident.organization_id} />
  <IncidentDailyCrewGrid incidentId={incident.id} />
</TabsContent>
```

**Why this is safe**
- No new tables, no migrations, no RLS changes
- No edits to `IncidentDailyCrewGrid`, shift-tickets, or any totals logic
- Existing TruckCrewSection on truck detail pages keeps working — both entry points write through the same hooks/service
- React Query keys (`incident-truck-crew`) are already shared, so assignments stay in sync between the two surfaces

## Out of scope (flag for later)
- Bulk move crew member between trucks (currently you release + reassign)
- Date-ranged assignments (today everything is "current")
- Editing actual logged shift hours from the Crew tab — those still come from shift tickets to preserve the audit trail
