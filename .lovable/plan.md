

# Cycle A: Vehicle Walk-Around Inspections

## Decisions locked in
- **Reset cadence**: end of shift. A walk-around is "due" again once the previous shift on that truck ends (or at local midnight if no shift exists yet).
- **Who can complete**: any authenticated user in the org who has access to that incident/truck.

## Scope (Cycle A only)

Build the inspection feature end-to-end. Inventory, Owner View, and App Mode toggle come in Cycle B.

## 1. Database migration

New tables (all org-scoped, RLS modeled on existing tables):

- **`inspection_templates`** — org-level named templates  
  `id, organization_id, name, is_default, created_at`
- **`inspection_template_items`** — items per template  
  `id, template_id, label, sort_order, created_at`
- **`truck_inspections`** — one row per completed walk-around  
  `id, truck_id, organization_id, incident_id (nullable), shift_id (nullable), template_id, performed_by_user_id, performed_by_name, performed_at, status (pass|issues|partial), notes`
- **`truck_inspection_results`** — per-item results  
  `id, inspection_id, item_label, status (ok|issue|na), notes, photo_url`

Schema add:
- **`organizations.inspection_alert_enabled`** boolean default true
- **`trucks.inspection_template_id`** uuid nullable (per-truck override)

Data migration:
- For each org with rows in `truck_checklist_items`, create one default `inspection_templates` row and copy distinct labels into `inspection_template_items`. Existing `truck_checklist_items` table is left in place (read-only) until Cycle B confirms nothing references it; then drop.

RLS: same pattern as existing tables — `organization_id IN (get_user_org_ids(auth.uid()))`. For `truck_inspection_results`, gate via parent inspection's org.

## 2. Services + hooks

- `src/services/inspections.ts` — CRUD for templates, template items, inspections, results; helpers: `getLastInspection(truckId)`, `isInspectionDueForTruck(truckId)`.
- `src/hooks/useInspections.ts` — React Query hooks mirroring service.

"Due" logic:
- Find latest `truck_inspections.performed_at` for truck.
- Find latest `shifts.end_time` for truck's `incident_trucks` rows.
- Due if no inspection exists OR last inspection is older than the most recent completed shift's end (or older than local midnight if no shifts).

## 3. UI components

- **`src/components/fleet/TruckInspectionSection.tsx`** (replaces `TruckChecklistSection` on truck detail)  
  Shows: status pill ("Walk-around due" amber / "Completed today by [name] at [time]" green), template item count, big "Start Walk-Around" button, recent inspections list (last 5 with who/when/status).
- **`src/components/fleet/TruckInspectionRunner.tsx`** — full-screen sheet  
  One item at a time or scroll list; each item has 3 large tap targets: **OK / Issue / N/A**. "Issue" expands inline note + optional photo. Sticky "Submit" button at bottom shows progress (e.g. "12/18 — 2 issues").
- **`src/components/fleet/InspectionTemplateEditor.tsx`** — accessed from Org Settings; add/remove/reorder items; mark default template.

## 4. Wiring

- `src/pages/FleetTruckDetail.tsx` — swap `TruckChecklistSection` → `TruckInspectionSection`.
- `src/pages/Dashboard.tsx` — add "Walk-around due" banner listing trucks currently on active incidents that are due (tap → opens that truck).
- `src/pages/OrgSettings.tsx` — add "Inspection Templates" link + toggle for `inspection_alert_enabled`.

## 5. What stays untouched

- `truck_checklist_items` table and existing `TruckChecklistSection.tsx` file remain until Cycle B (zero risk of data loss).
- All other modules (incidents, shifts, expenses, crew) unchanged.
- Auth, RLS pattern, offline queue, routes — unchanged.

## Files

| File | Change |
|---|---|
| DB migration | New 4 tables, 2 column adds, data copy from existing checklist |
| `src/services/inspections.ts` | New |
| `src/hooks/useInspections.ts` | New |
| `src/components/fleet/TruckInspectionSection.tsx` | New |
| `src/components/fleet/TruckInspectionRunner.tsx` | New |
| `src/components/fleet/InspectionTemplateEditor.tsx` | New |
| `src/pages/FleetTruckDetail.tsx` | Swap section |
| `src/pages/Dashboard.tsx` | Add due banner |
| `src/pages/OrgSettings.tsx` | Add template editor entry + alert toggle |

## Test after build
- On a truck with no inspections, Dashboard shows "Walk-around due" if truck is on active incident.
- Tap "Start Walk-Around" → mark items OK/Issue/N/A → add a photo to one issue → submit → see "Completed by [you] at [time]".
- Wait for shift to end (or end one) → status flips back to "due".
- Edit template in Org Settings → new item appears in next walk-around.
- Existing checklist data appears as the default template items.

