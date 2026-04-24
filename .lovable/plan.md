

# Why 3/20 isn't showing on the Daily Crew list

## Root cause
Ticket `c38445b7…` for DL62 on **3/20/2026** has:
- equipment_entries: 1 row (06:30–19:00, 12.5 hrs) ✓
- **personnel_entries: [] (empty)** ✗

The Daily Crew matrix is built from `personnel_entries` (operator name + hours per date). With no personnel entries on that ticket, no crew show up for 3/20 — even though the equipment side is filled in. That's why you can see the truck-day exists but the crew row is blank.

This is a **data state**, not a bug. You created/duplicated the ticket and filled in the equipment row but never added the crew names + times.

## Two ways to fix, your choice

### Option A — I add the crew to the existing ticket (fastest)
Push the standard 3/20 crew onto ticket `c38445b7…`:
- Crew assigned to DL62 incident_truck `2cb13256…` (active members of `incident_truck_crew`)
- Same shift window as equipment: **06:30 → 19:00**, total 12.5 hrs each
- Default remarks "Work" (no per-diem / lodging)

I'll fetch the active crew list for that truck before writing so the names match what's actually on the truck. You confirm the names, I update the JSONB, and the Daily Crew tile fills in.

### Option B — You open the ticket in the UI and use CrewSyncCard
Same result, but you do it on-screen so you can verify each crew member is correct, adjust per-diem flags, etc. CrewSyncCard pulls equipment start/stop and applies it to all crew with one tap.

## Recommendation
**Option A**, but I'll show you the crew list and proposed personnel rows first and you say go before I write.

## Optional: prevent this silently happening again
A small UX guard in `ShiftTicketForm.tsx`: if a ticket has equipment hours but **zero personnel entries** at save time, show a non-blocking warning ("This ticket has equipment hours but no crew logged — Daily Crew won't include it"). Doesn't stop the save (drafts are valid mid-entry), just flags the gap. Add this only if you want — say the word.

## Files / data touched
- **Option A**: 1 row in `shift_tickets` (`c38445b7…`) — JSONB update of `personnel_entries`. No code changes.
- **Optional UX guard**: `src/components/shift-tickets/ShiftTicketForm.tsx` — add empty-personnel warning on save.

## What you decide
1. **Option A** (I propose crew rows for 3/20, you confirm, I write) — or **Option B** (you fill it in via the UI)?
2. Add the empty-personnel **save warning** to prevent this recurring? (yes / no)

