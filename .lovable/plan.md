

# Timesheet Enhancements Plan

## What We're Changing

Four improvements to the OF-297 shift ticket personnel section:

### 1. Military Time (24h format)
All `<input type="time">` fields across `PersonnelEntryRow`, `EquipmentEntryRow`, `BulkTimeEntry`, and `ShiftCrewEditor` will get the `step="60"` attribute and explicit 24h formatting. Since HTML time inputs are locale-dependent on desktop, we'll add CSS to force 24h display and add helper text showing "HH:MM (24h)" labels.

### 2. License Plate & Company Name Flow-Through
`ShiftTicketCreate.tsx` already maps `truck?.plate` and `membership?.organizationName`. For **existing** tickets opened in `ShiftTicketEdit.tsx`, we need to ensure the latest truck and org data is available. We'll also re-fetch on edit so updated values appear (the user just updated these). No schema changes needed.

### 3. Structured Remarks Column (replacing free-text)
Replace the single `remarks` text field on each `PersonnelEntry` with structured selections, displayed in this order:

```text
Activity:     [ Travel/Check-In ] or [ Work ]     (radio/toggle, required)
Lodging:      [ ] Lodging                         (checkbox, optional)
Per Diem:     [ ] B  [ ] L  [ ] D                 (checkboxes, optional)
```

The `PersonnelEntry` type gets new optional fields:
- `activity_type`: `"travel"` | `"work"` (default `"work"`)
- `lodging`: `boolean` (default `false`)
- `per_diem_b`: `boolean`
- `per_diem_l`: `boolean`  
- `per_diem_d`: `boolean`

The `remarks` string is auto-computed from these selections in display order:
- `"Travel/Check-In"` or `"Work"`
- `", Lodging"` if checked
- `", Per Diem (B, L, D)"` with only selected letters

Example: `"Work, Lodging, Per Diem (B, D)"`

### 4. Bulk Apply Enhancement
The `BulkTimeEntry` component also gets the structured fields so the user can set activity type, lodging, and per diem for all crew at once.

## Files Changed

| File | Change |
|------|--------|
| `src/services/shift-tickets.ts` | Add new fields to `PersonnelEntry` type, add `buildRemarksString()` helper |
| `src/components/shift-tickets/PersonnelEntryRow.tsx` | Replace remarks text input with structured Activity/Lodging/PerDiem selectors, auto-compute remarks |
| `src/components/shift-tickets/ShiftTicketForm.tsx` | Update `BulkTimeEntry` with structured fields, update `emptyPersonnelEntry()` defaults |
| `src/components/shift-tickets/EquipmentEntryRow.tsx` | Add 24h time labels |
| `src/pages/ShiftTicketEdit.tsx` | Fetch truck + org data to ensure updated license plate and company name appear |
| `src/components/shifts/ShiftCrewEditor.tsx` | Add 24h time labels |

## What Won't Change
- Database schema (the `personnel_entries` JSONB column already stores arbitrary JSON, so new fields just serialize naturally)
- RLS policies (no new tables or columns on SQL tables)
- Multi-tenant scoping (all existing org_id checks remain)
- Existing shift ticket data (backward compatible -- old entries without new fields default gracefully)

