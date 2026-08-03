# Crew Rotation Schedule (downloadable)

## What the data shows right now

Pulled from every 2026 shift ticket for Dry Lightning (personnel entries by date). Sorted by who has been off the longest — that is the rotation order.

| Crew member | Last day worked | Days off as of 8/3 | Days worked 2026 | Last incident(s) |
|---|---|---|---|---|
| Justin Richardson | 3/25 | 131 | 7 | early season only |
| John Webber | 4/16 | 109 | 6 | — |
| Brandon Aldrich | 4/28 | 97 | 23 | — |
| Gabriel Beck | 6/13 | 51 | 23 | — |
| Landon Heisler | 6/13 | 51 | 22 | — |
| Bobby Bales | 7/02 | 32 | 32 | Ash Pole |
| Nevaeh Smith | 7/02 | 32 | 31 | Ash Pole |
| Chase Alexander | 7/06 | 28 | 17 | Stick Fire |
| Sheldon Sundstrom | 7/06 | 28 | 43 | Stick Fire |
| Bryce Dougherty | 7/20 | 14 | 14 | Hihanni Sica |
| Arnold "Arnie" Phipps | 7/20 | 14 | 14 | Hihanni Sica |
| Kaylee Aldrich | 8/01 | 2 | 9 | War Bonnet |
| Stacey Flute | 8/01 | 2 | 9 | War Bonnet |

Engine bosses (Dustin Aldrich, Les Madsen) excluded from the rotation list as requested.

**Next up after Bobby / Nevaeh / Justin roll on tomorrow:** Chase Alexander and Sheldon Sundstrom, then Bryce Dougherty and Arnie Phipps.

Note: a few name variants exist in older tickets ("Les Madison", "Les Muse") that don't match roster records; they're ignored here.

## What to build

A **Crew Rotation** report, mobile-first, under Reports (and linked from More).

Screen:
- Org-wide rotation table, one row per active crew member, sorted longest-rested first.
- Columns: Name, Role, Last day worked, Days off, Days worked (season), Last incident.
- Rows for anyone currently assigned to an active incident show an "On assignment" badge instead of a days-off count.
- Toggle: include/exclude engine bosses (default excluded).
- Loading, empty, and error states.

Export:
- PDF (table exporter already in place) and CSV, both via the existing share/download helper so it works on iOS and Android.
- Header: org name, "Crew Rotation — as of <date>".

## Technical notes

- New service `src/services/reports/rotation-report.ts`: reads `shift_tickets.personnel_entries` (name + date per entry), matches names case-insensitively against `crew_members` for the org, aggregates last worked day, distinct days worked, and last incident.
- Current assignment status from `incident_truck_crew` where `is_active = true` joined to non-demobed `incident_trucks`.
- New page `src/pages/CrewRotation.tsx` + route in `src/App.tsx`, entry point on `src/pages/More.tsx`.
- Reuse `downloadTablePdf` (`src/services/reports/exporters/pdf-table.ts`) and `downloadCsv`; no new deps.
- Unmatched ticket names are collected and shown as a small "unmatched names" footnote so bad data is visible instead of silently dropped.
- No schema changes.
