
# Fleet Status + Incident Truck/Crew Flow Improvements

## Issues observed

1. **Fleet truck status can't be edited from the truck page.** The status badge in `TruckInfoSection` is read-only. Editing requires going to "Edit" full form.
2. **Incident → Truck → Crew flow is buried.** On `IncidentDetail`, after expanding a truck, the Crew section is a collapsed accordion ("Crew") several rows down. No obvious primary CTA for the most common action: "Add crew to this truck."
3. **Assign-truck picker on incidents is plain** — no photo, no quick context.

## Fix plan (3 small, safe changes)

### 1. Tap-to-change status on Fleet truck detail (`TruckInfoSection.tsx`)
- Make the status badge in the collapsible header a button that opens a small inline status picker (4 chips: Available, Deployed, Maintenance, Needs Attention).
- Wire to existing `useUpdateTruck(id)` hook (already imported in the parent).
- Show toast on success. No new files, no schema changes.
- Pass an `onStatusChange` callback down from `FleetTruckDetail.tsx`.

### 2. Make the incident truck → crew flow obvious (`IncidentTruckList.tsx`)
When a truck card is expanded:
- Move **Crew** to be the **first** section after the status row (above shift tickets, details, etc.).
- Replace the collapsed `SectionHeader` wrapper for Crew with an always-visible block that shows assigned crew + a prominent "Add Crew" button.
- Keep the existing "No Crew" warning banner — it already triggers `autoOpen`.
- Other sections (Shift Tickets, Truck Details, Resource Orders, Agreements, Shifts) stay as collapsibles below.

Result: When you tap a truck on an incident, you immediately see crew (or an empty state with a big "Add Crew" button), then everything else.

### 3. Tighten the assign-truck picker (`IncidentTruckList.tsx`)
Small polish: show truck unit type / make under the name in the assign list so users pick the right one fast. No layout change.

## Files changed

| File | Change |
|---|---|
| `src/components/fleet/TruckInfoSection.tsx` | Status badge → tap to open inline picker; accept `onStatusChange` prop |
| `src/pages/FleetTruckDetail.tsx` | Wire `useUpdateTruck` and pass `onStatusChange` to `TruckInfoSection` |
| `src/components/incidents/IncidentTruckList.tsx` | Reorder expanded sections so Crew is first and not collapsed; add subtitle to assign-truck rows |

## What won't change
- No DB schema changes.
- No changes to crew assignment logic (`useAssignCrew` already works).
- Existing status/crew/shift-ticket data is untouched.
- No changes to routes, auth, or offline behavior.

## What to test after
- Open a truck in Fleet → tap status badge → pick new status → confirm it saves and the list updates.
- Open an incident → expand a truck → confirm Crew is at the top with "Add Crew" visible → assign a crew member.
- Try assigning a truck to an incident → confirm the picker shows truck name + unit/make.
