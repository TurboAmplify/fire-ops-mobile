

# Payroll review for Coyote Flats

## What I found in the data

Here's exactly what the database has for Coyote Flats personnel entries (12-hr shifts unless noted), plus what payroll **should** be paying given the rates on file ($28.73 base + $4.93 H&W; Dustin & Justin are flat $1000/day):

| Crew | Dates worked | Total Hrs | Reg | OT | Expected Gross |
|---|---|---|---|---|---|
| **Brandon Aldrich** (hourly) | 3/19 (18), 3/20 (13), 3/22, 3/23, 3/24, 3/25, 3/26 | 91 | 80 | 11 | **$3,166.85** |
| **Bobby Bales** (hourly) | 3/19, 3/21 (12.5), 3/22, 3/23, 3/24 (12.5), 3/25 (12.5), 3/26 | 85.5 | 76.5 | 9 | **$2,962.86** |
| **Sheldon Sundstrom** (hourly) | 3/19, 3/22, 3/23, 3/24, 3/25, 3/26 | 72 | 64.5 | 7.5 | **$2,476.36** |
| **Nevaeh Smith** (hourly) | 3/19 (18), 3/20 (13), 3/21 (12.5), 3/22, 3/23, 3/24 (12.5), 3/25 (12.5), 3/26 | 103.5 | 80 | 23.5 | **$3,705.99** |
| **Dustin Aldrich** (DAILY $1000) | 3/19, 3/20, 3/22, 3/23, 3/24, 3/25, 3/26 | — | — | — | **$7,000** (7 shifts × $1000) |
| **Justin Richardson** (DAILY $1000) | 3/19, 3/21, 3/22, 3/23, 3/24, 3/25, 3/26 | — | — | — | **$7,000** (7 shifts × $1000) |

**Total expected gross for Coyote Flats: ~$26,312**

## What's actually wrong (likely sources of the "off" number)

I can see four real issues in the data, *separate from* whether the engine math is right:

### 1. Stale 0-hour entries on Apr 23 (today)
Bobby Bales, Justin Richardson, and Sheldon Sundstrom each have a personnel entry dated **2026-04-23** with **0 hours**, on a recently-touched ticket. The engine ignores `hours <= 0`, so it doesn't change pay — but these are leftover empty rows from a duplicate or auto-create that should be cleaned up.

### 2. Missing days for some crew
- Bobby Bales has **no entry for 3/20** (overnight shift) — but Brandon, Dustin, and Nevaeh do, with 13 hrs each.
- Sheldon Sundstrom has **no entry for 3/20 or 3/21**.
- Brandon, Dustin, Sheldon have **no entry for 3/21** while others worked 12.5.

If those crew actually worked those days, their pay will be low. If they didn't, the numbers are right and just look small compared to peers.

### 3. The 3/19 → 3/20 overnight shift looks double-counted for some
Brandon, Dustin, and Nevaeh each have **18 hrs on 3/19 AND 13 hrs on 3/20** — that's 31 hrs in ~24 hours of clock time. Looking at the source ticket (`da798036…`), it's an overnight shift with `op_start: 18:00, op_stop: 07:00` (= 13 hrs). It seems someone created **two entries** for the same overnight shift — one logged on 3/19 and one on 3/20 — instead of one logged on either 3/19 (start date) or 3/20 (end date). That's inflating the hours by ~13 per person for those three crew.

### 4. Day-rate crew aren't being shown on the by-incident hours rollup
Dustin and Justin are paid daily ($1000/shift). The engine correctly pays them $7000 for 7 shifts — but on the per-incident detail panel inside the crew row, day-rate crew show **$0 reg / $0 OT / $0 H&W** with the hours. Pay is correct in the overall gross but the per-incident breakdown table looks blank, which can make it appear payroll is "missing" their numbers.

## What this plan will do

### A. Audit fix (data, not code)
Remove the three stray `0`-hour Apr 23 entries from tickets `…` (Bobby, Justin, Sheldon). I'll do this with a targeted update that strips the matching personnel entries in JSONB.

### B. Decide & fix the 3/19/20 overnight double-count
You tell me which is right; I'll update the affected ticket(s):
- **Option 1**: Delete the 3/20 entries on the overnight ticket (keep only the 3/19 start date) — pay stays at 13 hrs that night.
- **Option 2**: Delete the 3/19 entries (keep only 3/20) — same total.
- **Option 3**: It really was two separate shifts and the data is right.

### C. Code fix — show day-rate pay in the per-incident breakdown
In `src/lib/payroll.ts` the per-incident totals for daily-pay crew compute `incRegPay = 0, incHwPay = 0, incOTPay = 0, incGross = dates.size * dailyRate`. The grand total is correct, but the per-incident UI row in `src/pages/Payroll.tsx` shows the empty Reg/OT/H&W columns and hides the gross. Fix:
- For daily-pay crew, display **"Daily — N shifts × $rate = $X"** in place of the hours/Reg/OT columns inside `byIncident`.
- Keep the engine's `incGross` so the totals roll up correctly (already do).

### D. Verification step after fixes
Run a one-shot SQL recap of every Coyote Flats personnel entry by crew + week so you can eyeball it against the table above before signing off. No code, just a query.

## Files touched
- `src/pages/Payroll.tsx` — render daily-rate row inside the expanded `byIncident` block.
- *(no changes to `src/lib/payroll.ts` — math is correct)*
- Database: targeted DELETEs of the three stray Apr-23 personnel entries; optional fix of the overnight double-count once you confirm which day is correct.

## Open question for you (one)
For the overnight 3/19→3/20 shift (Brandon, Dustin, Nevaeh), do you want it logged as **one 13-hr shift on 3/19**, **one 13-hr shift on 3/20**, or were these two separate shifts that legitimately total ~31 hrs in 24 hours?

