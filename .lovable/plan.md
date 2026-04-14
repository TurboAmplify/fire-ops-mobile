

# Dashboard Redesign -- World-Class Mobile Experience

## Current state
The dashboard has: hero image (224px), stats row, 2x3 operations grid, and a recent incidents list showing up to 3 items. It works, but there's redundancy and wasted space. The hero takes up nearly half the screen before any actionable content appears.

## My recommendation

### 1. Kill the hero image, keep the brand minimal
Top-rated apps (Uber, Cash App, Venmo, Google Pay) do NOT waste above-the-fold space on decorative images. The user opens this app 20+ times a day during fire season -- they know what app they're in. The hero is beautiful but costs 224px of prime real estate.

**Replace with**: The fixed header already says "FireOps HQ" with the logo. That's enough branding. Jump straight into content.

### 2. Merge stats into the operations grid
The stats row (Active/Trucks/Crew) and operations grid are separate sections showing overlapping info -- Incidents tile + Active stat, Fleet tile + Trucks stat, Crew tile + Crew stat. World-class apps merge these.

**New layout**: A single 2x3 grid where each tile shows the icon, label, AND the live count as a small badge. This eliminates an entire section.

```text
+------------------+------------------+------------------+
| [fire]           | [truck]          | [clock]          |
| Incidents    (3) | Fleet        (3) | Time             |
+------------------+------------------+------------------+
| [receipt]        | [users]          | [doc]            |
| Expenses         | Crew         (8) | Tickets          |
+------------------+------------------+------------------+
```

Counts appear as small badges on relevant tiles. No separate stats row needed.

### 3. Recent incidents -- show only active, compact format
For the dashboard, only **active** incidents matter. Closed ones are history. Show active incidents in a compact horizontal pill/chip format if there are few (1-3), or a small vertical list if more.

If no active incidents: show a calm "All clear" state instead of an empty card.

If active incidents exist: show them as compact cards right below the grid. Keep "See All" link to the full incidents page.

### 4. Add Needs List and Payroll to the operations grid
These are currently hidden. Make it a 3x3 grid (9 tiles) or keep 2x3 with the most important 6. Since the user can customize the bottom nav, the dashboard grid should show ALL operations as the master menu.

**My recommendation**: Keep it at 2x3 with the 6 most-used operations. Payroll and Needs List are accessible via the bottom nav customizer. This keeps the dashboard clean.

## Final dashboard layout (top to bottom)

```text
[Fixed header: FireOps HQ logo + gear icon]

[Operations grid -- 2x3 with badge counts]
  Incidents(3)  Fleet(3)     Time
  Expenses      Crew(8)      Tickets

[Active Incidents -- only active ones]
  79 Fire - Buffalo Gap          ACTIVE
  Ashby - NE                     ACTIVE
  
  See All >

[bottom nav bar]
```

Total scroll: nearly zero. Everything fits on one screen. This is the Uber/Cash App pattern.

## Files changed
- `src/pages/Dashboard.tsx` -- remove hero image, merge stats into grid tiles with badge counts, filter incidents to active only, remove stats section

## What will NOT change
- No database changes
- No routing changes  
- No workflow or form logic changes
- Bottom nav unchanged
- Operations grid tiles still link to the same pages
- Settings gear stays in header

## Risk
Low. Removing decorative hero and merging two visual sections. All navigation paths preserved.

