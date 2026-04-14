

# Clean Up Equipment Time + Crew Sync Card

## Issues from screenshot
1. **Date overlaps Start time** -- the 3-column grid is too tight on mobile for a date input
2. **"Work" button is confusing** -- user wants to remove the Work/Travel toggle (remarks can handle that)
3. **B/L/D not labeled** -- unclear what they mean without context
4. **Per Diem needs its own labeled row** -- separate from Lunch/Lodging

## Changes

### 1. Fix EquipmentEntryRow grid (`EquipmentEntryRow.tsx`)
- Change Date row from `grid-cols-3` to: Date on its own row (full width), then Start/Stop/Total on a second row as `grid-cols-3`
- This prevents the date input from overlapping the time fields

### 2. Clean up CrewSyncCard (`CrewSyncCard.tsx`)
- **Remove** the Work/Travel toggle button entirely (activity defaults to "work", context handled via remarks)
- **Remove** the work context input
- **Row 1**: `[Lunch] [Lodging]` -- two chip toggles, plus lunch time input inline when Lunch is active
- **Row 2**: Small "Per Diem" label, then `[B] [L] [D]` chips
- **Apply button** stays the same

```text
AFTER:
┌────────────────────────────────────────┐
│ [Lunch] [Lodging]   lunch@1200         │
│ Per Diem  [B] [L] [D]                 │
│ [Apply to All Crew (3)  10.5h]        │
└────────────────────────────────────────┘
```

### 3. Update buildRemarksString in `shift-tickets.ts`
- Since activity_type is removed from UI, default to "Work" in the remarks builder (no breaking change, just always outputs "Work" unless explicitly set)

## Files changed
- `src/components/shift-tickets/EquipmentEntryRow.tsx` -- fix date/time grid layout
- `src/components/shift-tickets/CrewSyncCard.tsx` -- remove Work/Travel, add Per Diem label, clean layout
- `src/services/shift-tickets.ts` -- minor: default activity_type to "work" in buildRemarksString

