

## Plan: Rename "Personnel" to "Crew" + Fix Bulk Date Reset

### Issues
1. **Section header says "Personnel"** — should say "Crew" to match terminology.
2. **BulkTimeEntry date resets to today on edit** — the `bulkDate` state initializes with `new Date()` (line 511) instead of reading the date from the existing personnel entries. When editing a saved ticket, the bulk entry box always shows today's date instead of the ticket's actual shift date.

### Changes

**File: `src/components/shift-tickets/ShiftTicketForm.tsx`**

1. **Line 394**: Change section heading from `"Personnel"` to `"Crew"`.
2. **Line 407-409**: Update the helper text from "crew member" wording (already correct) — no change needed there.
3. **BulkTimeEntry component** (line 504-638): Change the `bulkDate` initialization to accept the first personnel entry's date as a prop, falling back to today only if no entries exist. Also initialize the other bulk fields (activity type, lodging, per diem) from the first entry so the bulk tool reflects existing data when editing.

Specifically:
- Add a `defaultDate` prop to `BulkTimeEntry` derived from `personnelEntries[0]?.date`.
- Pass it from the parent at line 403.
- Initialize `bulkDate` with that prop instead of `new Date()`.
- Also seed `bulkActivity`, `bulkWorkContext`, `bulkLodging`, and per diem states from the first personnel entry so the entire bulk section mirrors existing data on edit.

**File: `src/components/shift-tickets/PersonnelEntryRow.tsx`**

- Line 41: Change the row label from `"Personnel Row {index + 1}"` to `"Crew Row {index + 1}"`.

### No other files affected. Two files, minimal changes.

