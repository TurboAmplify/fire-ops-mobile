

# Compact Crew List: Initials Row with Tap-to-Expand

## Problem
With 23 crew members, even collapsed PersonnelEntryRows take ~23 lines of vertical space (each is a full-width card with name, date, badges, hours, chevron). This pushes the time entry card way off screen.

## Solution
Replace the list of individual collapsed cards with a compact **initials row** -- small circular avatar chips showing crew initials. Tapping an initial opens that crew member's detail row inline (or as the only expanded card). One line of wrapped initials covers ~8-10 crew per row, so 23 crew fits in 3 rows instead of 23.

```text
BEFORE (23 cards):
┌ John Smith       10/14  10.5h  v ┐
┌ Jane Doe         10/14  10.5h  v ┐
┌ Bob Wilson       10/14  10.5h  v ┐
... (20 more cards)

AFTER (initials row + expand on tap):
Crew (23)                    [+ Add]
[JS] [JD] [BW] [MR] [TL] [AK] [CP] [DH]
[SG] [RN] [KF] [LM] [WB] [ET] [JC] [PD]
[HJ] [QR] [VT] [XY] [ZA] [NM] [OL]

(tap JS →)
┌ John Smith  10/14  Op: 0600-1800  10.5h ┐
│ [time fields, remarks, etc.]             │
└──────────────────────────────────────────┘
```

## Changes

### 1. Wrap crew list in `ShiftTicketForm.tsx`
- Default view: render crew as a flex-wrap row of small circular chips (32x32px) showing 2-letter initials
- Each chip is color-coded: muted if no hours logged, primary-tinted if hours > 0
- Tapping a chip sets `expandedPersonnelIndex` to that crew member, showing the full `PersonnelEntryRow` expanded below the initials row
- Tapping again (or another chip) collapses it
- Show total crew hours next to the section header: `Crew (23) -- 241.5h`

### 2. Build initials helper
- Extract initials from `operator_name`: "John Smith" -> "JS", "Bob" -> "BO", empty -> crew index number
- Small utility function, inline in the form component

### 3. No changes to PersonnelEntryRow
- The expanded form stays exactly as-is -- only one shows at a time when a chip is tapped

## Files changed
- `src/components/shift-tickets/ShiftTicketForm.tsx` -- replace mapped PersonnelEntryRow list with initials chip row + single expanded detail

