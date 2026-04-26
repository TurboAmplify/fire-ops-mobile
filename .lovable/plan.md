## Tighten the Incident Detail screen

Goal: keep the existing structure and data, but remove visual noise, reduce vertical bulk, and make the page feel calmer and more scannable. Field-friendly, no logic changes.

### Issues today

1. **Header area** wastes a row: the title and a separate uppercase "Type" line, plus a status pill that's hard to tell is interactive.
2. **Info cards** are 4 separate cards in a 2-col grid — looks heavy for a few short values.
3. **Section labels** are inconsistent — some are uppercase paragraph headers (`OF-286 INVOICE`, `INCIDENT AGREEMENTS`, `ASSIGNED TRUCKS`, `DAILY CREW`), others are inside collapsibles (`OF-297 SHIFT TICKETS`, `TRUCK DETAILS`, etc.). No consistent visual rhythm.
4. **Truck cards** when expanded show many full-width collapsible rows stacked vertically — feels like a wall of toggles.
5. **Spacing** between sections varies (`space-y-5` outer, `space-y-3` inner, `space-y-2` deeper) — uneven gaps.
6. **Delete button** sits at the bottom in plain text, easy to miss but also not consistent with the rest.

### Plan

#### 1. Cleaner page header (`src/pages/IncidentDetail.tsx`)
- Combine name + type onto one block: bold name, smaller muted type underneath (already there but tighten margins).
- Make the status pill obviously tappable: add a tiny chevron next to the label and a subtle hover/active background. Same colors retained.
- Move the status editor (the row of pill buttons) into a small popover-style row directly under the pill instead of pushing the whole page down with a flex-wrap row.

#### 2. Compact info strip instead of 4 cards
- Replace the 2x2 grid of `InfoCard`s with a single rounded card containing a horizontal row of 2-4 stats (icon + value, label below). On narrow widths it wraps; on wider it stays one row.
- Removes 3 redundant card backgrounds and shadows. Same data, ~40% less vertical space.
- Containment progress bar stays where it is, but moves *into* the same compact strip card so it's grouped with the % stat.

#### 3. Unify section headers
- Introduce one shared `IncidentSection` wrapper (in `src/components/incidents/IncidentSection.tsx`) with:
  - Consistent label style (uppercase, tracking, muted)
  - Optional right-side action slot
  - Optional collapsible behavior (defaults to open for primary sections, closed for secondary)
- Refactor these to use it:
  - OF-286 Invoice (already a card — keep card, just standardize header)
  - Incident Agreements
  - Assigned Trucks
  - Daily Crew
- Net effect: same content, identical-looking section headers across the page.

#### 4. Calmer truck card body
- In `IncidentTruckList.tsx` `TruckCard`:
  - Move "Change Status" from a labeled row of pills to a single segmented control (still uses existing buttons, just `bg-secondary` container with selected highlight, no extra label row).
  - Combine "Truck Details" and the small photo block — keep the existing collapsible but tighten internal spacing.
  - Group secondary collapsibles (`Truck Details`, `Resource Orders`, `Agreements`) under a thin divider to visually separate "operational" (Status / Crew / Shift Tickets) from "reference" sections.
  - Change "Remove from incident" to a small ghost button aligned right at the bottom of the secondary group instead of left-aligned destructive text — less visually loud during normal use, still one tap to confirm.

#### 5. Consistent spacing
- Standardize on `space-y-4` between top-level sections and `space-y-2` inside sections. Header to first section gap reduced.
- Padding reduced from `p-4` to `px-4 py-3` on the outer container so content aligns better with the AppShell header.

### Out of scope
- No data, hook, or routing changes.
- No new colors — uses existing tokens.
- Daily Crew internal layout stays as-is (already clean per your screenshot).
- Shift Tickets section stays as-is (already updated last turn).

### Files to touch
- `src/pages/IncidentDetail.tsx` — header, info strip, section wrappers, spacing.
- `src/components/incidents/IncidentTruckList.tsx` — segmented status, grouped secondary sections, remove button restyle.
- `src/components/incidents/IncidentSection.tsx` — new shared section wrapper.

### What you'll notice after
- Page feels ~25–30% shorter at the top.
- All section headers look identical.
- Truck cards expand into a calmer two-group layout instead of a stack of collapsibles.
- Every interactive element (status pill, expand toggles, remove) has clear affordance.