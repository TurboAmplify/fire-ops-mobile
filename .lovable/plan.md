# Factoring Dashboard

Mobile-first, admin-only dashboard at `/factoring` accessible from the More tab. Ties every factoring submission (invoice schedule) to its incident and surfaces the four rollups.

## Data model change

Add one nullable column to `factoring_submissions`:
- `reserve_released_at timestamptz` — null = reserve still held, non-null = released.
- (Optional companion) `reserve_released_by uuid` for audit.

No new table. No change to existing submit flow. Existing 3 Dry Lightning rows (2× Ash Pole, 1× Long Term Severity) will show up automatically because "submitted" is the source of truth.

## Metric definitions (locked in from your answer)

Per submission row:
- Submitted = `total_amount`
- Advanced = `total_amount − reserve_amount` (auto, assumed paid on submission)
- Reserve held = `reserve_amount` when `reserve_released_at IS NULL`, else 0
- Outstanding = `reserve_amount` when `reserve_released_at IS NULL`, else 0 (same as reserve held under this model — shown as one KPI, not two, to avoid double-counting)

Final KPI cards on the dashboard: **Total Submitted · Advanced · Reserve Held (Outstanding) · Released**.

## Screens

### `/factoring` — Factoring Dashboard (new page, admin-only)

Top: 4 stacked KPI cards on mobile, 4-across on desktop. Currency formatted, large numbers, muted labels. Uses existing card + Tailwind tokens — no new colors.

Middle: **By Incident** list. One row per incident with any submissions:
- Incident name + date range
- Submitted / Advanced / Reserve Held totals
- Count of schedules
- Tap row → expands to show that incident's schedules (schedule #, date, total, advanced, reserve, status chip: **Held** / **Released**, and a **Mark Released** / **Mark Held** toggle for admins)

Empty state: "No factoring submissions yet." with a link to a factoring-enabled incident.

Loading: existing skeleton pattern. Error: existing toast + retry.

### More tab

Add a "Factoring" entry, admin-only, gated by `modules_enabled.factoring` (matches how the FactoringSubmitCard is gated today). Icon: `Receipt` from lucide.

### Route

`/factoring` wrapped in `ProtectedRoute` + `AdminGate` + `ModuleGate module="factoring"`, lazy-loaded like Payroll.

## Files

New:
- `src/pages/FactoringDashboard.tsx` — page shell, KPI cards, incident list
- `src/components/factoring/FactoringKpiCards.tsx`
- `src/components/factoring/IncidentFactoringRow.tsx` — expandable incident row + schedule sublist + toggle
- `src/hooks/useFactoringDashboard.ts` — one query joining `factoring_submissions` + `incidents` scoped to active org, returns grouped rollups

Modified:
- `src/App.tsx` — add lazy route `/factoring`
- `src/pages/More.tsx` — add admin-only "Factoring" tile, gated by factoring module
- `src/services/factoring.ts` — add `listOrgFactoringSubmissions(orgId)` and `setReserveReleased(submissionId, released: boolean)`
- `src/integrations/supabase/types.ts` — regenerated after migration (automatic)

## Backend

Migration:
- `ALTER TABLE public.factoring_submissions ADD COLUMN reserve_released_at timestamptz, ADD COLUMN reserve_released_by uuid;`
- RLS: existing admin update policy on `factoring_submissions` already covers the toggle; verify and add an update policy if missing (scoped to org admins via `has_role`).

No new grants needed (table already granted).

## Dry Lightning verification

After ship, the dashboard for Dry Lightning will show:
- 3 submissions across 2 incidents
- Ash Pole: 2 schedules, $112,000 submitted / $95,200 advanced / $16,800 reserve held
- 2026 Long Term Severity: 1 schedule, $54,334 submitted / $46,183.90 advanced / $8,150.10 reserve held
- Totals: **$166,334 submitted · $141,383.90 advanced · $24,950.10 reserve held**

All reserves start as **Held** (matches reality today; you can toggle Released as WideQ pays them out).

## Mobile-first details

- KPI cards stack full-width < 640px, 2×2 at sm, 4×1 at lg
- Currency uses `Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})`
- Tap targets ≥ 44px, expand chevron is a whole-row button
- No hover-only affordances; status chip + toggle are always visible when expanded
- Uses the AppShell scroll container (no nested scroll)

## Out of scope (call out, don't build)

- Per-invoice payment tracking (would need line-item level status)
- Factor statements / reconciliation import
- Batch "release all reserves" action — can add later if useful
