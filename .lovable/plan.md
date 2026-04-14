

# Fix Sticky Header + Clean Up Settings + Compact Dashboard

## Three issues to address

### 1. Sticky header not working on scroll
The header uses `sticky top-0` which should work, but the `glass` backdrop-filter class can cause stacking context issues in some mobile browsers. Fix: change from `sticky` to `fixed` positioning and add a spacer div below it so content doesn't hide behind it. This is the standard mobile app pattern (iOS/Android both use fixed headers).

**File**: `src/components/AppShell.tsx`

### 2. Remove Crew/Fleet/Needs List from Settings
These are duplicated from the Dashboard operations list. Settings should only contain: account info, org settings link, appearance (theme + nav customizer), about, legal, and sign out.

**File**: `src/pages/Settings.tsx` -- remove the Crew, Fleet, and Needs List rows from the Organization section. Keep only the org name/settings link.

### 3. Compact Dashboard operations with icon grid tiles

**My recommendation: 2x3 icon grid tiles** (like iOS Shortcuts or Google Pay).

Why this over other options:
- **Carousel**: Bad for discoverability -- users don't know what's hidden off-screen. Violates "minimize taps" principle.
- **Expandable/collapsible**: Adds a tap just to see options. Hides the core of the app.
- **Current list rows**: Takes ~400px of vertical space for 6 items. Too much scrolling.

**Icon grid tiles** compress 6 operations into ~200px (half the space) while keeping everything visible at a glance. This is what Uber, Cash App, Google Pay, and most world-class mobile apps do for their main action grid. Each tile is a compact square with an icon and label -- no description text needed since users learn them quickly.

Layout: 3 columns, 2 rows. Each tile is a rounded card with centered icon + label below. Large touch targets maintained.

```text
+------------+------------+------------+
| [fire]     | [truck]    | [clock]    |
| Incidents  | Fleet      | Time       |
+------------+------------+------------+
| [receipt]  | [users]    | [doc]      |
| Expenses   | Crew       | Tickets    |
+------------+------------+------------+
```

This cuts the operations section height in half and looks more polished. The stats row above already uses 3-column grid, so this creates visual consistency.

**File**: `src/pages/Dashboard.tsx` -- replace the `QuickAction` list with a 2x3 grid of compact tiles.

## Files changed
- `src/components/AppShell.tsx` -- fixed header instead of sticky
- `src/pages/Settings.tsx` -- remove duplicate Crew/Fleet/Needs List rows
- `src/pages/Dashboard.tsx` -- operations become icon grid tiles

## What will NOT change
- No database changes
- No routing changes
- No workflow or form logic changes
- Bottom nav unchanged
- Settings page keeps all its current functionality

