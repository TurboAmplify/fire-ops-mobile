

# Add Crew Assignment Prompt to Truck Cards

## Summary

When a truck has no crew assigned, show a prominent warning banner inside the expanded truck card -- right above the Shift Tickets section. The banner nudges the user to add crew and provides a one-tap action to open the crew assignment picker. No existing flows are broken; this is additive UI only.

## What changes

### 1. `src/components/incidents/IncidentTruckList.tsx`

- Import `useIncidentTruckCrew` hook
- Inside each expanded truck card, call `useIncidentTruckCrew(it.id)` to get the active crew count
- If active crew count is 0, render an amber warning card between the status changer and the Shift Tickets section:
  - Icon: `AlertTriangle` (already imported pattern in TruckCrewSection)
  - Text: "No crew assigned to this truck -- add crew before creating shift tickets"
  - Button: "Add Crew" that auto-opens the Crew section and triggers the assign picker
- Auto-expand the Crew `SectionHeader` when crew count is 0 (change `defaultOpen` to true when no crew)

### 2. `src/components/incidents/TruckCrewSection.tsx`

- Accept an optional `autoOpen?: boolean` prop
- When `autoOpen` is true, initialize `showAssign` to `true` so the crew picker is immediately visible

### 3. `src/components/shift-tickets/ShiftTicketSection.tsx`

- No changes needed -- the warning banner sits above it in the parent, which is sufficient guidance

## Technical details

- `useIncidentTruckCrew` is already built and returns crew with `is_active` flag
- The warning banner uses existing Tailwind utility classes (amber bg, rounded-xl, touch-target button)
- The Crew SectionHeader gets `defaultOpen={activeCrew === 0}` so it's open when empty
- A ref or state callback scrolls the crew section into view when "Add Crew" is tapped

## Files changed

| File | Change |
|------|--------|
| `src/components/incidents/IncidentTruckList.tsx` | Add crew count check, warning banner, auto-open crew section |
| `src/components/incidents/TruckCrewSection.tsx` | Add `autoOpen` prop |

