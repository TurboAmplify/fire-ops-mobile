

# World-Class Dashboard Redesign

## Current problems
1. Horizontal scrolling incidents feels disconnected from the vertical page flow
2. "Add Expense" and "Scan Receipt" are redundant -- scanning IS the expense workflow 98% of the time
3. Stats buried in the middle instead of being the first thing you see
4. Too many small sections competing for attention -- no clear visual hierarchy

## Design philosophy: Uber-level simplicity
The best apps (Uber, Linear, Arc) have one rule: **hierarchy through size and position**. The most important thing is biggest and highest. Everything else falls below. No competing sections.

## New layout (top to bottom)

```text
+----------------------------------+
|  FireOps HQ              [gear] |
|----------------------------------|
|                                  |
|  OVERVIEW (hero stats)           |
|  ┌──────┐ ┌──────┐ ┌──────┐    |
|  │  2   │ │  12  │ │  5   │    |
|  │Active│ │ Crew │ │Fleet │    |
|  └──────┘ └──────┘ └──────┘    |
|                                  |
|  ACTIVE INCIDENTS                |
|  ┌─────────────────────────┐    |
|  │ ● Riverside Fire        │    |
|  │   Riverside, CA         │    |
|  ├─────────────────────────┤    |
|  │ ● Cedar Creek           │    |
|  │   Bend, OR              │    |
|  └─────────────────────────┘    |
|  (or "All Clear" empty state)   |
|                                  |
|  ── glow divider ──             |
|                                  |
|  QUICK ACTIONS (3 cols)          |
|  [Shift     ] [Scan    ] [New  ]|
|  [Ticket    ] [Receipt ] [Inc. ]|
|                                  |
|  NEEDS LIST (preview)            |
|  ┌─────────────────────────┐    |
|  │ item 1                  │    |
|  │ item 2                  │    |
|  │ item 3                  │    |
|  │ +2 more items           │    |
|  └─────────────────────────┘    |
+----------------------------------+
```

## Key changes

### 1. Overview stats move to the TOP
First thing you see when opening the app. Glanceable command-center feel. Same 3-column glass tiles but now the hero position.

### 2. Active incidents become a stacked list (no horizontal scroll)
Vertical cards inside a single glass container with dividers. Feels integrated with the page. Each row is tappable with the pulse dot, name, and location. Consistent with how every other list in the app works.

### 3. Quick Actions: Shift Ticket, Scan Receipt, New Incident
- **Shift Ticket** (ClipboardList, blue) -- the daily driver
- **Scan Receipt** (ScanLine, emerald) -- replaces both "Add Expense" and "Scan Receipt"
- **New Incident** (Plus, destructive) -- less frequent but critical

### 4. Needs List stays at the bottom
Already works well. No changes needed.

### 5. Remove "Add Expense" button entirely
Scan Receipt goes to `/expenses/batch-scan` which handles the real workflow. Manual expense entry is still accessible from the Expenses tab in the nav.

## Files changed
- `src/pages/Dashboard.tsx` -- reorder sections, replace horizontal scroll with stacked list, update quick actions

## What will NOT change
- No database or routing changes
- Glass-tile styling preserved
- Mesh gradient background kept
- Needs list section unchanged
- Bottom nav unchanged

