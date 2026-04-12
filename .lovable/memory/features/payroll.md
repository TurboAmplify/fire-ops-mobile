---
name: Payroll module
description: Weekly payroll with per-employee rates, H&W on first 40hrs, 1.5x OT, Mon-Sun weeks
type: feature
---
- Each crew member has `hourly_rate` and `hw_rate` on crew_members table
- Organizations have `default_hw_rate` column
- Payroll formula: reg_hrs (up to 40) * (base + hw_rate) + ot_hrs * base * 1.5
- Monday is start of work week
- H&W only applies to first 40 hours, NOT overtime
- OT rate is 1.5x base rate only (no H&W on OT)
- Payroll tab in bottom nav; Fleet/Crew/Settings moved to "More" tab
- Data sourced from shift_crew hours joined with crew_members rates
