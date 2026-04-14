

# Polish Dashboard UI + Restyle Active Incidents

## The problem
The layout is right but the visual treatment is flat -- every tile looks the same gray, and the active incidents as stacked rows feel like a basic list. Two upgrades will make this feel premium without adding complexity.

## Changes

### 1. Color-tinted icon backgrounds on grid tiles
Give each tile a unique subtle color tint instead of all using the same `bg-secondary`. This is what Uber, Revolut, and Cash App do -- each action has its own color identity so users build muscle memory visually.

| Tile | Icon bg | Icon color |
|------|---------|------------|
| Incidents | `bg-destructive/12` | `text-destructive` (already) |
| Fleet | `bg-blue-500/12` | `text-blue-500` |
| Time | `bg-amber-500/12` | `text-amber-500` |
| Expenses | `bg-emerald-500/12` | `text-emerald-500` |
| Crew | `bg-violet-500/12` | `text-violet-500` |
| Tickets | `bg-sky-500/12` | `text-sky-500` |

### 2. Active incidents as horizontal scroll chips
Instead of stacked full-width rows, active incidents become a **horizontal scrolling row of compact cards**. Each card shows the incident name, location, and a pulsing dot indicator. This:
- Saves vertical space (single row vs N rows)
- Looks more dynamic and modern
- Works great for 1-5 active incidents
- If zero incidents: keep the current "All Clear" card

The cards will be ~160px wide, showing name + location, with a small red pulse dot. Horizontal scroll with `overflow-x-auto` and snap points.

### 3. Subtle section styling
- Add a thin gradient divider line between Operations and Active Incidents sections
- Slightly larger section headers with better spacing

## File changed
- `src/pages/Dashboard.tsx` -- update GridTile to accept color props, refactor incident list to horizontal scroll, add color map

## What will NOT change
- No database or routing changes
- Grid layout stays 2x3
- All navigation paths preserved
- Badge counts unchanged

