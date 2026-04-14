

# Simplify Incident Statuses: Active / Demob / Closed

## Why this is right
The current 4 statuses (active, contained, controlled, out) mirror fire suppression stages -- that's the Incident Commander's world, not the contractor's. Contractors care about:
- **Active** -- working the incident, logging time/expenses
- **Demob** -- demobilizing, finishing paperwork, wrapping up
- **Closed** -- done, everything submitted

This matches the real operational workflow and reduces decision fatigue when updating status.

## Changes

### 1. `src/services/incidents.ts`
- Update `IncidentStatus` type: `"active" | "demob" | "closed"`
- Update `STATUS_LABELS`: Active, Demob, Closed
- Add status color mapping for consistent styling across pages

### 2. `src/pages/Incidents.tsx`
- Update filter chips to `["all", "active", "demob", "closed"]`
- Update status badge colors: active = red, demob = amber/yellow, closed = green

### 3. `src/pages/IncidentDetail.tsx`
- Update `statusOptions` array to the new 3 statuses
- Update status color logic to include demob (amber)

### 4. `src/pages/IncidentEdit.tsx`
- Status selector already uses `STATUS_LABELS` -- will work automatically

### 5. `src/pages/Dashboard.tsx`
- No changes needed -- already filters by `status === "active"`

### 6. Database migration
- Update the default value for `incidents.status` (already "active", no change needed)
- Migrate any existing rows with "contained" or "controlled" to "demob", and "out" to "closed"

## What stays the same
- The `containment` percentage field stays on incidents for reference
- `acres` field unchanged
- All other incident functionality unchanged
- No routing changes

## Files changed
- `src/services/incidents.ts`
- `src/pages/Incidents.tsx`
- `src/pages/IncidentDetail.tsx`
- `src/pages/IncidentEdit.tsx`
- Database migration to update existing data

