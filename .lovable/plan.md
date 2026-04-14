

# Reorder: Equipment on Top, Crew Below with Inline Status

## What's changing

### 1. Move Equipment Time card above Crew section (`ShiftTicketForm.tsx`)
Current order: Crew (initials) -> Equipment Time + CrewSync card
New order: Equipment Time + CrewSync card -> Crew section

### 2. Add compact status line below initials row (`ShiftTicketForm.tsx`)
Right below the initials chips, show 1-2 lines summarizing the current per diem/lodging/lunch state pulled from the CrewSyncCard values. Something like:

```text
Crew (23) 241.5h                    [+ Add]
[JS] [JD] [BW] [MR] [TL] [AK] [CP] [DH]
Lunch 1200 | Lodging | Per Diem B, L, D
```

This is read-only summary text -- the actual controls to change these values stay in the CrewSyncCard (inside the Equipment Time card). When you tap a crew member initial, the full PersonnelEntryRow expands below as it does now.

### 3. No other changes
CrewSyncCard stays inside the Equipment Time card with the Apply button. PersonnelEntryRow expand-on-tap stays the same.

## Files changed
- `src/components/shift-tickets/ShiftTicketForm.tsx` -- swap section order, add compact status line below initials

