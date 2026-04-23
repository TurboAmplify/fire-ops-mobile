

# Payroll Review & Enhancements

## Audit results (what's already correct)

| Requirement | Status |
|---|---|
| OT = 1.5x **base only** (no H&W on OT) | Correct (line 169) |
| H&W applies to **first 40 hrs only** | Correct (line 168) |
| Week = **Monday–Sunday** | Correct (`weekStartsOn: 1`) |
| Payroll populated from **shift ticket personnel entries** | Correct |
| Admin-only access | Correct |

## Gaps to fix

1. **Default rates are wrong.** Current crew_compensation rows are $28.50 base / $5.65 H&W. Per your reference: **$28.73 base / $4.93 H&W** (~$33.66 total).
2. **No "all fires" total view** — page is locked to one week at a time. You can't see season totals.
3. **No per-incident breakdown per crew member** — when you expand a crew row, it only shows weekly totals, not which fires those hours came from.
4. **Sort by fire is partial** — there's an incident filter, but no per-fire subtotals or "view by fire" mode.

## Plan

### 1. Update default rates
- Bulk-update existing `crew_compensation` rows to **$28.73 / $4.93** (only rows still at the old $28.50 / $5.65 — won't touch any custom rates already set).
- Update org `default_hw_rate` to **4.93**.
- Update memory file to reflect new defaults.

### 2. Add view modes to Payroll page
Add a tab toggle at the top:

```text
┌─────────────────────────────────────────────┐
│  [ This Week ]  [ Pay Period ]  [ All Time ] │
└─────────────────────────────────────────────┘
```

- **This Week** — current Mon–Sun view (unchanged behavior)
- **Pay Period** — pick any custom date range (defaults to current 2-week period)
- **All Time** — every shift ticket entry, season-to-date totals

OT calculation stays **per Mon–Sun week** in all modes (so "All Time" sums each week's OT correctly — never lumps 200 hrs into one OT bucket).

### 3. Per-incident breakdown on crew expand
When you tap a crew member to expand, show their hours broken down by fire:

```text
Les Madson                    $1,847.20
40 reg + 12 OT hrs
─────────────────────────────────
By Fire:
  Dry Lightning      32 hrs    $1,108.16
  Pine Ridge         20 hrs    $  739.04
─────────────────────────────────
Base Rate: $28.73/hr
H&W: $4.93/hr (first 40 hrs)
Regular Pay: $1,149.20
H&W:           $197.20
OT (1.5x):     $517.14
─────────────────────────
Gross:       $1,863.54
```

### 4. "View by Fire" mode
Add a second toggle next to the date-range tabs:

```text
[ By Crew ]  [ By Fire ]
```

- **By Crew** (default, current view) — list of crew with totals
- **By Fire** — list of incidents, each expandable to show every crew member who logged hours on that fire + per-fire subtotal

This gives you both angles: "what does each person get paid?" and "what does each fire cost in labor?"

## Technical details

- All changes client-side except a single migration to bump rate defaults.
- Aggregation logic moves into a small helper that groups personnel entries by `(crew_member_id, incident_id, week_start)` so OT is always weekly even in all-time view.
- Date range respects local timezone (uses existing `local-date.ts` helpers).
- No schema changes — `crew_compensation` and `shift_tickets.personnel_entries` already have everything we need.
- Files touched:
  - `src/pages/Payroll.tsx` — add view tabs, by-fire mode, per-incident breakdown
  - `src/lib/payroll.ts` (new) — pure aggregation/calc helpers + tests-friendly
  - 1 migration: update default rates
  - `.lovable/memory/features/payroll.md` — update rate defaults

## One thing to confirm before I start

The rate update will only touch crew_compensation rows that are currently at the old default ($28.50 / $5.65). Any rows you've manually customized to a different rate will be left alone. Sound right?

