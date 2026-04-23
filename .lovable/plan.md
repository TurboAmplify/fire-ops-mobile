

# Payroll navigation — "Jump to weeks with activity"

## Problem
Reviewing a historical incident requires arrowing through empty weeks one at a time. Even "All Time" mixes everything together. There's no way to see at a glance which weeks an incident actually has hours on, or jump straight to one.

## Solution
Default to **All Time**, plus add an **"Active Weeks" drawer** that lists every week with logged hours for the current filter (incident or crew). Tap a week → jumps view to that week instantly.

### A. Default range = "All Time"
Today the page opens on "This Week" — fine for current crew bosses, but useless for historical review. Default to **All Time** instead. This single change solves the most common case ("show me Coyote Flats payroll") because everything appears at once, grouped under the incident.

### B. New "Active Weeks" picker
Below the range tabs, add a compact horizontal pill: **`Jump to week ▾`**. Tapping opens a bottom sheet (mobile) / dropdown (desktop) showing every Mon–Sun week that has at least one shift in the current filter context, newest first:

```text
Active Weeks — Coyote Flats
─────────────────────────────
Mar 16 – Mar 22, 2026     39 hrs   $4,625
Mar 09 – Mar 15, 2026     14 hrs   $1,200
Feb 23 – Mar 1, 2026      12 hrs     $850
─────────────────────────────
```

Each row is a 44px+ tap target. Tapping:
1. Switches `viewRange` to `"week"`.
2. Sets `weekStart` to that Monday.
3. Closes the sheet.
4. Filter (incident / crew) is preserved.

Only weeks with activity appear — no empty weeks to scroll past.

### C. "By Fire" expand → show weeks
In the "By Fire" view, when you tap an incident to expand it, also include a **"Weeks worked"** section with the same chip list. Tapping a week chip narrows the page view to that week and the current incident. This makes the workflow:

> Tap incident → see weeks → tap week → see crew breakdown for that week.

No more arrowing.

### D. Keep existing controls
- This Week / Pay Period / All Time tabs stay.
- Prev/next chevrons stay (still useful for stepping forward/back one week once you're zoomed in).
- Crew + Incident filters stay.

## Technical details (small, contained)

**`src/pages/Payroll.tsx`**
- Change initial `viewRange` from `"week"` → `"all"`.
- Compute new memo `activeWeeks: { weekStart: Date; hours: number; gross: number }[]` from `normalizedTickets` (already filtered by `incidentFilter`/`crewFilter`). Group personnel entry dates by Mon-anchored week, sum hours, sort newest-first.
- Add `<button>` "Jump to week" → opens `<Sheet>` (already in ui kit) with the list.
- New handler `jumpToWeek(date)` sets `viewRange="week"` and `weekStart=date`.

**No schema, no engine changes.** All derived from data already loaded. No new query, no perf cost — same `shiftTickets` array, just one extra reduce.

**Mobile-first:**
- Bottom sheet on mobile (`<Sheet side="bottom">`), max-h-[70vh] scroll.
- Each row 56px tall with hours + gross on the right.
- Empty state: "No weeks with hours for this filter."

## What changes for the user
1. Open Payroll → see everything ("All Time"), no scrolling.
2. Filter by Coyote Flats → see all crew + totals immediately.
3. Want week-by-week breakdown? Tap **Jump to week** → see only weeks Coyote Flats had activity → tap one → done.
4. By Fire view → tap fire → tap a week chip inside → zooms in.

## Files touched
- `src/pages/Payroll.tsx` — default range, active weeks computation, sheet UI, jump handler, week chips inside expanded fire row.

No other files. No migration. No engine changes. Mobile-first, App-Store-safe (additive only, no removed features).

