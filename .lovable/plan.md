

# Cycle B-lite: Inventory Split + Nav Persistence Fix

## Three issues to fix

### 1. Walk-around template is bloated with inventory items (96 items!)
Items like "100ft 1.5\" hose (x6)", "Chainsaw + fuel", "PPE gear on board", "Fire extinguisher (x2)" are **inventory** (counted gear), not walk-around safety checks. They were merged from old `truck_checklist_items` data.

**Fix**: Split into two templates per org:
- **Walk-Around Inspection** — ~25 safety items (tires, lights, fluids, brakes, mirrors, etc.)
- **Inventory Check** — equipment counts (hoses, tools, PPE, supplies)

I'll auto-classify the existing 96 items by keyword and rebuild as two clean templates.

### 2. No inventory list UI
Add an **Inventory Section** on the truck detail page using the same inspection plumbing — just a different template type. New column `inspection_templates.template_type` (`walkaround` | `inventory`), default `walkaround`. Then:
- `TruckInspectionSection` filters to walkaround templates.
- New `TruckInventorySection` filters to inventory templates.
- Both use the same `TruckInspectionRunner` (already supports OK/Issue/N/A — for inventory we'll reuse: OK = on truck, Issue = missing/damaged, N/A = not applicable).
- Inventory has no "due" alert (it's not time-based — checked when needed).

### 3. Nav bar preferences not saving
Looking at `BottomNav.tsx` + `NavBarCustomizer.tsx`: localStorage-based, dispatches `nav-tabs-changed` event. Likely culprits:
- `getSelectedTabKeys()` accepts arrays of length 1-4, but if the user picks 5+ it silently rejects.
- Save handler runs even when `selected.length > 4` is invalid.
- No feedback if save fails.

Actually re-reading the code: `toggle()` already caps at 4. The save button is disabled outside 1-4. The mechanism *should* work.

Real bug possibilities:
- **Localstorage write succeeding but `nav-tabs-changed` event firing before BottomNav mounts the listener** — unlikely since BottomNav is always mounted.
- **The dialog is closed before save commits** — possible if user taps backdrop.
- **Most likely**: `selected` state in NavBarCustomizer initializes from `getSelectedTabKeys()` but on Settings re-mount, the dialog already had stale state.

I'll: (a) confirm save with a toast, (b) ensure save commits before dialog closes, (c) re-read state every time dialog opens (already done via useEffect — good), (d) add the "inventory" tab option to the nav choices.

## What changes

| File | Change |
|---|---|
| DB migration | Add `inspection_templates.template_type`, classify existing items into walk-around vs inventory, create separate Inventory Check template per org with the inventory items, trim walk-around template down |
| `src/services/inspections.ts` | Add `templateType` filter to `getDefaultTemplate`, expose `fetchTemplates(orgId, type)` |
| `src/hooks/useInspections.ts` | Pass through `templateType` |
| `src/components/fleet/TruckInspectionSection.tsx` | Filter to walkaround only |
| `src/components/fleet/TruckInventorySection.tsx` | New — mirrors inspection section but for inventory |
| `src/components/fleet/InspectionTemplateEditor.tsx` | Add tabs: Walk-Around / Inventory |
| `src/components/fleet/TruckInspectionRunner.tsx` | Accept `mode` prop ("walkaround" | "inventory") to relabel buttons (OK/Missing/N/A for inventory) |
| `src/pages/FleetTruckDetail.tsx` | Add `<TruckInventorySection />` below inspection section |
| `src/components/settings/NavBarCustomizer.tsx` | Add "Inventory" tab option; show save toast; ensure save commits |
| `src/components/BottomNav.tsx` | No change needed (already responsive to event) |

## What's NOT changing
- Existing inspection logic/RLS — untouched.
- All other modules.
- The `truck_checklist_items` legacy table — still untouched (will drop in Cycle C).

## Test after
- Open a truck → see Walk-Around section with ~25 safety items + new Inventory section with the gear list.
- Run an inventory check → mark items OK/Missing → submit → see the log entry.
- Open Settings → Customize Nav Bar → pick 4 tabs → save → confirm bottom nav updates immediately.
- Refresh app → nav choices persist.

