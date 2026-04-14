

# Restore Time Entry + Compact Crew Sync

## Problem
The equipment time entries, CrewSyncCard, and personnel entries sections were dropped from the JSX during the chip-row refactor. The imports exist but the components are never rendered -- that's why there's no place to enter time.

## Plan

### 1. Restore missing sections in `ShiftTicketForm.tsx`
Add back between the chip-row drawers (line ~511) and the Signatures section (line ~512):
- Equipment entries with Add row button
- CrewSyncCard
- Personnel entries with Add crew button

### 2. Make CrewSyncCard more compact in `CrewSyncCard.tsx`
Current layout is tall with many stacked rows. Redesign to be a single tight card:
- Remove the "Equipment Times" readout box (redundant -- user just entered times above)
- Put Travel/Work toggle + Lunch checkbox + Lodging + Per Diem (B/L/D) all in a compact 2-row layout
- Work context input only shows when "Work" is selected
- Lunch time input only shows when lunch is checked
- "Apply to All Crew" button stays at bottom, same size

```text
BEFORE (~200px tall):
┌─ Equipment Times readout ─┐
│ Lunch checkbox + time      │
│ Travel | Work buttons      │
│ Work context input         │
│ Lodging checkbox           │
│ Per Diem: B L D            │
│ [Apply to All Crew]        │
└────────────────────────────┘

AFTER (~100px tall, expands as needed):
┌────────────────────────────┐
│ [Travel|Work]  [Lunch] [Lodging] [B][L][D] │
│ Work context (if Work)  Lunch@(if checked)  │
│ [Apply to All Crew (3)]                     │
└─────────────────────────────────────────────┘
```

## Files changed
- `src/components/shift-tickets/ShiftTicketForm.tsx` -- restore 3 missing sections
- `src/components/shift-tickets/CrewSyncCard.tsx` -- compact single-row layout

