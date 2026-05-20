
# Plan: RO ↔ Truck linking + multi-truck clarity

Goal: keep the current incident structure (Tickets / Trucks / Crew / Overview). Resource Orders stay tied to a truck — but they're created at the right moment, AI-suggested when possible, and clearly labeled wherever they appear. Tickets and Crew get a lightweight truck label/filter so multi-truck incidents are easy to read.

No tab restructure. No database restructure beyond one optional field.

---

## 1. RO at incident creation — AI suggests the truck

Today: user uploads RO in `IncidentCreate.tsx`, we parse it for autofill, then **delete the file**. RO never gets stored.

Change:
- After incident is created, if an RO was uploaded, keep the file.
- Call existing `parse-resource-order` (already returns `resource_name`, `resource_type`, `resource_order_number`, etc.).
- Compare parsed `resource_name` / `resource_type` against the org's `trucks` (name + unit_type) using simple fuzzy match (already have `src/lib/fuzzy-name.ts`).
- Show a small confirm step: **"This RO looks like it's for DL62 (Type 6 Engine). Attach to which truck?"** with the suggested truck pre-selected and a dropdown of all org trucks (plus "Skip — attach later").
- On confirm: create the `incident_trucks` row (if not yet assigned) and the `resource_orders` row tied to it. File is preserved.
- If user picks "Skip", file is discarded (current behavior).

UX impact: one extra confirm screen only when an RO was uploaded. Manual-entry path is unchanged.

## 2. Adding another truck to an existing incident → prompt for its RO

Today: `IncidentTruckList` lets you add a truck — no RO prompt.

Change:
- After "Add truck" succeeds on an incident, show an inline prompt on the new truck card: **"Upload Resource Order for this truck?"** with Upload / Skip.
- Upload reuses the existing `ResourceOrderSection` flow (already parses + stores against `incident_truck_id`). Skip just collapses the prompt.
- Non-blocking — the truck is already added either way.

## 3. Overview — clear "which truck" labeling on the RO roll-up

`IncidentResourceOrdersRollup` already shows ROs across all trucks. Strengthen the truck label so it's unmissable when multiple trucks exist:

- Group by truck when the incident has ≥2 trucks (small section header per truck: "DL62 · Type 6 Engine"). Single-truck incidents keep the current flat list.
- Each RO row already shows truck name; add a colored truck chip to make it scannable.
- Keep upload off the Overview — uploads stay on the Trucks tab as the single source of truth.

## 4. Tickets and Crew — truck filter chip when multi-truck

Today: `IncidentTicketsTab` and `IncidentDailyCrewGrid` show everything for the incident.

Change (only renders when incident has ≥2 trucks):
- A horizontal chip row at the top: **All · DL62 · DL31 · …**
- Selection filters the visible list client-side (no query changes needed — tickets already carry `incident_truck_id`; crew rows already carry truck assignment).
- Selection persists in component state only (resets on tab change). No localStorage, no global state.
- Each ticket/crew row also gets a small truck chip badge so the answer is visible without filtering.

Single-truck incidents see zero change.

## 5. Finance Officers — defer

Per your earlier note, finance contacts feel wrong on the truck card. **Not changing in this plan.** Keep current behavior; we'll handle finance contacts placement in a separate pass once this multi-truck pattern is settled. (Same chip pattern will apply when we move it.)

---

## Technical notes

**Schema change (minimal):**
- `resource_orders` already has `incident_truck_id` — no change needed. We just stop deleting the file on incident create and insert the row.
- No new tables, no RLS changes.

**Files touched:**
- `src/pages/IncidentCreate.tsx` — keep file, add truck-suggest confirm step
- `src/lib/fuzzy-name.ts` — reuse existing helper for truck matching
- `src/components/incidents/IncidentTruckList.tsx` — post-add RO prompt
- `src/components/incidents/IncidentResourceOrdersRollup.tsx` — group-by-truck when ≥2
- `src/components/incidents/IncidentTicketsTab.tsx` — truck filter chips + per-row truck badge
- `src/components/incidents/IncidentDailyCrewGrid.tsx` — truck filter chips + per-row truck badge

**Risk:** low. No data migration, no tab structure change, no auth/RLS touch. New UI is additive and only activates on multi-truck incidents (which today is rare in your data).

**Out of scope:** finance officers move, demob paperwork move, removing Trucks tab, global truck switcher.
