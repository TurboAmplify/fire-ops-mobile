

# Two fixes: Drop "Shifts" from contractor flow + truly fix nav-bar persistence

## Fix 1 — Remove "Shifts" entirely (use Shift Tickets only)

The contractor flow has both a "Shifts" section AND a "Shift Tickets" section on every incident truck. Shifts duplicate the timekeeping that Shift Tickets (OF-297) already capture. Remove Shifts everywhere.

**Changes**
- `src/components/incidents/IncidentTruckList.tsx` — delete the "Shifts" `SectionHeader` block (lines ~333-346) and the `ShiftList` import.
- `src/App.tsx` — delete `/incidents/:incidentId/trucks/:incidentTruckId/shifts/new` and `/shifts/:shiftId` routes; delete `ShiftCreate` and `ShiftDetail` imports.
- Delete files (no longer referenced): `src/components/shifts/ShiftList.tsx`, `src/pages/ShiftCreate.tsx`, `src/pages/ShiftDetail.tsx`, `src/pages/Time.tsx` (uses `useAllShifts` only).
- Keep `src/services/shifts.ts`, `src/hooks/useShifts.ts`, and the `shifts` / `shift_crew` DB tables for now — they're harmless and removing them is risky cleanup we can do later.

## Fix 2 — Nav bar resets every time

**Root cause:** the customizer requires the user to tap a separate "Save" button. If they close the dialog any other way (backdrop tap, Escape, Android back gesture, or just walking away), nothing is written to localStorage. On refresh they see defaults again and assume it "reset."

**Fix — auto-save on every change, no Save button needed.**
- `src/components/settings/NavBarCustomizer.tsx`:
  - Remove the Save button entirely.
  - In `toggle()`, after computing the new selection, write to localStorage and dispatch `nav-tabs-changed` immediately (only if length is 1-4, which `toggle` already enforces).
  - Show a small inline "Saved" indicator in the dialog header instead of a toast on save.
  - Keep dialog open until user dismisses it.
- `src/components/BottomNav.tsx` — keep the existing event listener / bump pattern (it works once the write actually happens).
- `src/pages/More.tsx` — already reads on every render via `getSelectedTabKeys()`. To make it react to changes while the More page is open, add the same `nav-tabs-changed` listener + bump pattern.

**Why this works for sure:** every tap on a nav choice writes immediately. There's no separate "commit" step to forget. localStorage persists across refresh. The bottom nav and More page both subscribe to the change event.

## Files

| File | Change |
|---|---|
| `src/components/incidents/IncidentTruckList.tsx` | Drop Shifts section + import |
| `src/App.tsx` | Drop 2 shift routes + 2 imports |
| `src/components/shifts/ShiftList.tsx` | Delete |
| `src/pages/ShiftCreate.tsx` | Delete |
| `src/pages/ShiftDetail.tsx` | Delete |
| `src/pages/Time.tsx` | Delete |
| `src/components/settings/NavBarCustomizer.tsx` | Auto-save on toggle; remove Save button; inline "Saved" indicator |
| `src/pages/More.tsx` | Subscribe to `nav-tabs-changed` so list updates live |

## What's NOT changing
- Shift Tickets (OF-297) flow — fully intact, this is the only timekeeping path going forward.
- DB tables `shifts` / `shift_crew` — left in place; can drop in a later cleanup migration.
- The org-mode framework, payroll lock-down, Training, etc. — untouched.

## Test after
- Open an incident truck card → confirm only Resource Orders / Agreements / Truck Info / Crew sections (no "Shifts").
- Settings → Customize Nav Bar → tap any tab → see it highlight + "Saved" indicator → close dialog by tapping backdrop → refresh page → bottom nav still shows the new selection.
- Repeat with 4 tabs selected; deselect one → bottom nav updates immediately.

