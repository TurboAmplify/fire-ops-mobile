

# Plan: Equipment-Driven Crew Time Auto-Fill with Lunch Break

## What We're Solving

Currently the user has to manage equipment times and crew times separately, plus use the bulk apply tool. Since crew hours almost always match equipment hours (minus an optional 30-min lunch), we can eliminate most manual crew time entry.

## New Flow

1. User enters equipment start/stop time as usual
2. When equipment time is saved/changed, a prompt appears: **"Apply equipment times to all crew?"**
3. If the shift is over 8 hours, the prompt also asks: **"Did the crew take a 30-min lunch?"** with a time picker for when lunch started
4. Crew personnel entries auto-fill:
   - `op_start` = equipment start
   - `op_stop` = equipment stop  
   - `total` = equipment total (minus 0.5h if lunch selected)
   - Lunch break noted in remarks
5. Individual crew members remain tappable/editable via the existing collapsible rows

## UI Design

Replace the current `BulkTimeEntry` component with a simpler **"Sync Crew from Equipment"** card that appears between the Equipment and Crew sections:

```text
+---------------------------------------------+
| Sync Crew Times from Equipment              |
|                                             |
| Equipment: 0600 - 1800 (12.0h)             |
|                                             |
| [x] 30-min lunch break                     |
|     Lunch at: [12:00] (24h)                |
|                                             |
| Activity: [Travel] [Work]                  |
| Work Context: [IA2 - Fire Name]            |
| Lodging: [ ]  Per Diem: [B] [L] [D]       |
|                                             |
| [ Apply to All Crew (4) ]                  |
+---------------------------------------------+
```

When lunch is checked:
- Crew `op_start` = equipment start
- Crew `op_stop` = equipment stop
- Crew `total` = equipment total - 0.5
- Remarks include "30-min lunch at 1200"

The lunch checkbox auto-appears checked when equipment total > 8h, but user can uncheck it.

## Changes

### ShiftTicketForm.tsx
- Remove the old `BulkTimeEntry` component
- Add new `CrewSyncCard` component (inline or extracted) between Equipment and Crew sections
- It reads the first equipment entry's start/stop to display current equipment times
- Includes lunch break toggle + time picker
- Keeps activity type, work context, lodging, per diem fields
- "Apply to All Crew" button fills all personnel entries
- Auto-suggest lunch checked when equipment total > 8h

### PersonnelEntryRow.tsx
- No changes needed -- collapsible edit still works for individual overrides

### No new files needed
- The sync card replaces BulkTimeEntry within ShiftTicketForm.tsx

## What Stays the Same
- Equipment entry row (unchanged)
- Individual crew member editing via collapsible rows
- Signatures, remarks, header fields
- PDF generation

