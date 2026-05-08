# Payroll fix-up + thin-crew warning

## Part 1 — Why the payroll numbers look wrong

I pulled the database for **2026 State Severity / DL62, week of Mon Apr 20 – Sun Apr 26 2026** (the Mon–Sun bucket containing 4/23):

| Date | Gabriel Beck | Sheldon Sundstrom | Les Madsen |
|---|---|---|---|
| 4/21 | 12 | 12 | 12 |
| 4/22 | 11.5 | 11.5 | 11.5 |
| 4/23 | 11.5 | 11.5 | 11.5 |
| 4/24 | 11.5 | 11.5 | 11.5 |
| 4/25 | 12 | 12 | 12 |
| 4/26 | 12 | 12 | 12 |

**The shift-ticket source data is correct** — every ticket lists all three names with full hours. There are zero negative payroll adjustments for any of them.

So the "3.5 hours" the page shows for Gabriel/Sheldon is a **display/aggregation issue**, not missing data. Two real problems exist and one needs investigation:

### 1a. Les Madsen's compensation is misconfigured (root cause of his $0)
- `crew_compensation` row: `pay_method = 'hourly'`, `hourly_rate = NULL`, `daily_rate = NULL`.
- You said he is paid **by the day** — so his row needs `pay_method='daily'` and a `daily_rate` set.
- **Fix**: open his crew comp settings in the Payroll → Settings sheet and switch to Daily + enter his daily rate. (No code change needed; this is a data fix you do in the UI. I'll confirm the form exposes "daily" cleanly when I implement.)

### 1b. Gabriel/Sheldon "3.5 hours" — needs a live look
The aggregator code (`src/lib/payroll.ts` → `aggregateCrewPayroll`) matches names case-insensitively, sums `pe.total`, and filters by `withinRange(pe.date, rangeStart, rangeEnd)`. Given the data above it should return ~70.5 hours each for that week, not 3.5.

I want to add a small **debug expander** under each crew row on the Payroll page (admin-only, behind a "Show source rows" toggle) that lists every personnel entry the aggregator counted for the selected range — date, ticket id, incident, hours. This makes any future "why is this number wrong?" question answerable in 2 seconds, and will immediately tell us why Gabriel reads 3.5 on your screen. Once we see what the page actually picks up, the fix (if any) is trivial.

## Part 2 — Thin-crew warning on shift tickets

Add a non-blocking-but-confirmed warning when a ticket's crew count is below the unit-type minimum.

### Rules
| Unit type contains | Minimum | Suggested max |
|---|---|---|
| "engine" or "Type 3/4/5/6" | **3** | 4 |
| "hand wash" / "wash trailer" | 1 | — |
| "water tender" / "tender" | 1 | — |
| anything else | 1 | — |

Distinct crew = unique `operator_name` values across `personnel_entries` for that ticket.

### Where it shows
1. **`ShiftTicketForm.tsx`** — yellow banner above the Personnel section whenever distinct crew < minimum, with copy like *"Engines should have at least 3 crew. This ticket has 2."*
2. **`SignaturePicker.tsx` (contractor signature step)** — if under minimum, show a confirm dialog: *"This ticket is below the recommended crew count for this unit type. Confirm and sign anyway?"* with **Cancel** / **I confirm short crew** buttons. Only after confirm does the signature flow proceed.
3. No hard block. Supervisor signature is unchanged.

### Implementation
- New helper `src/lib/crew-minimums.ts` exporting `getCrewMinimum(unitType: string|null): { min: number; suggestedMax: number|null; label: string }` and `evaluateCrewCount(entries, unitType)`.
- Use it in `ShiftTicketForm` (banner) and `SignaturePicker` (confirm dialog).
- Pure function, easy to unit-test later if desired.

## Part 3 — Files I'll touch
- `src/lib/crew-minimums.ts` (new)
- `src/components/shift-tickets/ShiftTicketForm.tsx` (add banner)
- `src/components/shift-tickets/SignaturePicker.tsx` (confirm dialog when contractor signing under min)
- `src/pages/Payroll.tsx` (add per-crew "Show source rows" debug expander, admin-only)

## What I will **not** touch
- Aggregation math in `src/lib/payroll.ts` — until the debug view confirms what's actually being read, I won't guess at a fix.
- Les Madsen's crew_compensation row — that's a data edit you'll do in the UI after I confirm the daily-pay form works for him.

## What to test after
1. Open Payroll → State Severity → expand Gabriel Beck → tap **Show source rows**. Tell me what dates/hours appear. We then know exactly what to fix (or confirm nothing's wrong).
2. Open a DL62 shift ticket and remove a crew member → see yellow banner.
3. Tap contractor sign on a 2-person engine ticket → confirm dialog appears.
4. Set Les Madsen's comp to Daily + a rate → his weekly total appears as `days × daily_rate`.
