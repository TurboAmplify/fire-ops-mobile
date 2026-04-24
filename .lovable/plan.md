

# One-time fix — Coyote Flats / DL62

## Confirmed data
- **Incident**: Coyote Flats (`29e18807-c396-4b64-bed7-c1037e374e76`)
- **Org**: `2ffa93de-506d-4aa7-a53e-a3a04d9626be`
- **Truck**: DL62 — currently has **8 shift tickets** (3/19 → 3/26), all status `draft`, none signed
- **Crew across remaining 7 shifts**: Justin Richardson, Bobby Bales, Sheldon Sundstrom (3/19–3/21), Nevaeh Smith (3/22–3/25)

## Step 1 — Delete the Thursday 3/26 shift ticket
Last day worked was Wednesday 3/25, so the 3/26 ticket should not exist.

```sql
DELETE FROM shift_tickets
WHERE id = '31e14ea4-ce71-46d4-a3c5-5b3a8ac33bea';
```

After: DL62 has 7 shift tickets — Justin appears on all 7. Matches your "Justin should have 7" requirement.

## Step 2 — Add +1 hr travel pay adjustments to each crew member, per shift

For every remaining DL62 shift (7 days × 3 crew = **21 adjustment rows**), insert a `payroll_adjustments` row:
- `adjustment_type`: `hours`
- `hours`: `1`
- `adjustment_date`: the shift date
- `incident_id`: Coyote Flats incident
- `crew_member_id`: matched by name → id
- `reason`: `"Owner approved +1 hr travel time — Coyote Flats (in addition to shift ticket hours)"`

This will auto-trigger `payroll_adjustment_audit_insert` (one audit row per adjustment), so the trail is preserved.

### Per-shift breakdown
| Date | Justin | Bobby | Sheldon | Nevaeh |
|------|--------|-------|---------|--------|
| 3/19 | +1 | +1 | +1 | — |
| 3/20 | +1 | +1 | +1 | — |
| 3/21 | +1 | +1 | +1 | — |
| 3/22 | +1 | +1 | — | +1 |
| 3/23 | +1 | +1 | — | +1 |
| 3/24 | +1 | +1 | — | +1 |
| 3/25 | +1 | +1 | — | +1 |
| **Totals** | **+7 hrs** | **+7 hrs** | **+3 hrs** | **+4 hrs** |

The +1 hr per crew per shift will appear:
- On Payroll page under Adjustments
- On each crew member's paystub (PDF + on-screen) as line items with the memo
- In the new Pay Adjustments section on each shift ticket (admin view), with the amber chip indicator
- In `payroll_adjustment_audit` for full traceability

## What this does NOT touch
- Personnel hours on the OF-297 tickets — unchanged (the +1 is post-script, exactly as the new pay-adjustments feature is designed to work)
- DL31 truck — untouched
- Any signed/finalized data — none of the affected tickets are signed
- Schema, RLS, functions — read-only data fix, no migrations

## Execution
Once approved, I'll run a single insert/delete batch via the data tool — one DELETE + 21 INSERTs — and confirm with a verification query showing the 7 remaining tickets and 21 new adjustment rows grouped by crew.

