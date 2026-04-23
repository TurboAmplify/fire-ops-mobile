---
name: Payroll module
description: Weekly payroll with per-employee rates, H&W on first 40hrs, 1.5x OT, Mon-Sun weeks
type: feature
---
- Default rates: $28.73 base / $4.93 H&W (~$33.66 combined)
- Each crew member has `hourly_rate` and `hw_rate` on `crew_compensation` table
- Organizations have `default_hw_rate` column (default $4.93)
- Payroll formula: reg_hrs (up to 40/week) * (base + hw_rate) + ot_hrs * base * 1.5
- Monday is start of work week (weekStartsOn: 1)
- H&W only applies to first 40 hours per week, NOT overtime
- OT rate is 1.5x base rate only (no H&W on OT)
- OT is always computed per Mon–Sun week, even in Pay Period / All Time views
- Payroll tab in bottom nav (admin-only); Fleet/Crew/Settings in "More" tab
- Data sourced from `shift_tickets.personnel_entries` joined to `crew_members` by name (case-insensitive)
- Aggregation logic lives in `src/lib/payroll.ts` (pure helpers)
- Page: `src/pages/Payroll.tsx` — supports This Week / Pay Period / All Time, By Crew / By Fire
