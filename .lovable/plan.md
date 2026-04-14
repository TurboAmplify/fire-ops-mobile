

# Tighten Dashboard: Single-Line Incidents + Compact Stats

Both changes follow good design principles. Uber, Linear, and iOS Settings all use single-line list rows. Compact stats are standard in dashboard design (Apple Health, Robinhood). Less padding = more content above the fold = better.

## Changes (all in `src/pages/Dashboard.tsx`)

### 1. Incident rows: single line
Combine name and location into one row using an inline separator. Currently it's two lines (name + location below). Change to:

```text
● Riverside Fire  ·  Riverside, CA    >
```

- Remove the `<div className="flex-1 min-w-0">` wrapper with two `<p>` tags
- Replace with a single `<p>` that shows `{inc.name} · {inc.location}` with truncation
- Reduce vertical padding from `py-3.5` to `py-2.5`

### 2. Stat cards: tighter padding
- Reduce padding from `p-4` to `p-3`
- Reduce number font from `text-xl` to `text-lg`
- Reduce gap from `gap-1.5` to `gap-1`
- This saves ~16px of vertical height across the section

### 3. Reduce section spacing
- Change outer `space-y-5` to `space-y-4` for slightly tighter overall feel

## What stays the same
- All functionality, routing, glass-tile styling, quick actions, needs list
- Touch targets remain above 44px minimum
- No database or logic changes

## File changed
- `src/pages/Dashboard.tsx`

