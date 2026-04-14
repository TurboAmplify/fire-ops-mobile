

# Compact Shift Ticket: Chip Row + Bottom Sheets

## The idea
Replace the three stacked collapsible sections (Header Info, Equipment Info, Options) with a single horizontal row of compact chip buttons. Tapping a chip opens a bottom sheet (Drawer) with the edit fields. Remarks also becomes a chip in the same row.

This cuts ~120px of vertical space and puts time entry, crew, and signatures front and center.

## Layout change

```text
BEFORE                          AFTER
┌──────────────────────┐       ┌──────────────────────────┐
│ [v] Header Info      │       │ [Header] [Equip] [Opts] [Remarks]  <- chip row
│    summary line      │       ├──────────────────────────┤
├──────────────────────┤       │ Equipment entries (times)│
│ [v] Equipment Info   │       │ Crew                     │
│    summary line      │       │ Signatures               │
├──────────────────────┤       └──────────────────────────┘
│ [v] Options          │
│    summary line      │
├──────────────────────┤
│ Equipment (times)    │
│ Crew                 │
│ Signatures           │
└──────────────────────┘
```

## Changes (all in `src/components/shift-tickets/ShiftTicketForm.tsx`)

### 1. Replace 4 Collapsibles with chip row
- Remove the 4 `<Collapsible>` blocks (Header, Equipment Info, Options, Remarks)
- Add a horizontal flex row with 4 small chip buttons: "Header", "Equipment", "Options", "Remarks"
- Each chip shows a subtle dot indicator if it has data filled in
- Chips are compact: small text, pill-shaped, scrollable row if needed

### 2. Bottom sheet (Drawer) for each chip
- Use the existing `Drawer` component (`src/components/ui/drawer.tsx`, already in project)
- State: `activeDrawer: "header" | "equipment" | "options" | "remarks" | null`
- Tapping a chip sets `activeDrawer`, opening the Drawer with that section's fields
- Drawer contains the exact same form fields currently in each CollapsibleContent
- Drawer has a "Done" button to close

### 3. Keep everything else unchanged
- Equipment entries (times), Crew, Signatures stay exactly where they are
- All state management, auto-save, dirty tracking unchanged
- Supervisor signature sheet popup unchanged

## File changed
- `src/components/shift-tickets/ShiftTicketForm.tsx`

## What stays the same
- All form fields and their behavior
- Save/export/duplicate logic
- Signature flow
- No database changes
- No new components needed (Drawer already exists)

