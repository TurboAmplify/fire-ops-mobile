

# Rethink Dashboard: Status Hub, Not Nav Mirror

## The insight
The operations grid duplicates the bottom nav. Top apps solve this by making Home a **live status feed + quick actions**, not a second navigation menu. The bottom nav handles module switching -- that's its job. The dashboard should answer: "What do I need to know RIGHT NOW?"

## Changes

### 1. Remove the operations grid entirely
The bottom nav (customizable, up to 4 tabs + Home) already handles navigation. The grid is redundant.

### 2. Replace with a contextual dashboard layout

```text
+----------------------------------+
|  FireOps HQ              [gear] |
|----------------------------------|
|  [Active Incidents - horiz scroll]|
|  (pulsing cards, already built)  |
|----------------------------------|
|  Quick Actions                   |
|  [+ Incident] [+ Expense] [Scan]|
|----------------------------------|
|  Today's Summary                 |
|  Active: 2  |  Crew: 12  |  ... |
|----------------------------------|
|  Needs List (preview)            |
|  - 3 items need purchasing       |
|  [View All ->]                   |
|----------------------------------|
|  Recent Activity                 |
|  "Shift ticket submitted 2h ago" |
|  "Expense added 4h ago"          |
+----------------------------------+
```

**Active Incidents** -- keep the horizontal scroll cards (already great)

**Quick Actions** -- 2-3 buttons for the most common *actions* (not pages): "New Incident", "Add Expense", "Scan Receipt". These are verbs, not nouns. Different from nav.

**Today's Summary** -- a compact stats row showing active incidents, crew on assignment, trucks deployed. Glanceable numbers.

**Needs List Preview** -- show top 3 unresolved needs items inline with a "View All" link. This puts Needs List on the dashboard without a redundant tile.

**Recent Activity** -- last 3-5 actions across the app (ticket submitted, expense added, crew assigned). Shows the app is alive and being used.

### 3. Deactivate Time module (as agreed)
- Comment out `/time` route + import in `App.tsx`
- Remove "time" from `NavBarCustomizer.tsx` options
- Keep files on disk

### 4. Add Needs List to NavBarCustomizer options
Already there (`key: "needs"`). Just ensure it's available as a default option now that Time is gone. Update `DEFAULT_TAB_KEYS` to replace "shift-tickets" or keep as-is -- user can customize.

## Files changed
- `src/pages/Dashboard.tsx` -- replace operations grid with quick actions, summary stats, needs preview, recent activity
- `src/App.tsx` -- comment out Time route
- `src/components/settings/NavBarCustomizer.tsx` -- remove "time" from `ALL_NAV_OPTIONS`
- `src/hooks/useNeedsList.ts` -- already exists, will import for dashboard preview

## What will NOT change
- Bottom nav system unchanged (still customizable)
- No database changes
- No routing changes (except Time deactivation)
- All module pages unchanged
- Shift ticket logic unchanged

## Risk
Low-medium. Dashboard is a visual-only change. Time deactivation is commenting out, not deleting.

