

# Plan: OF-297 Form Preview for Supervisor Signing + Collapsible Crew Rows

## What We're Solving

1. **Supervisor signing experience**: When the division leader/supervisor needs to sign, they currently see the app's custom form UI which is unfamiliar. Instead, we should show them a visual representation of the actual OF-297 shift ticket form they already know -- so they can review and sign without needing to learn the app.

2. **Crew section is cluttered**: All personnel entry rows are fully expanded, making it hard to scan. We should collapse crew members into compact summary rows (name, hours, date) and let the user tap to expand/edit any individual entry.

---

## Changes

### 1. Collapsible Personnel Rows (ShiftTicketForm.tsx + PersonnelEntryRow.tsx)

- Replace the current always-expanded `PersonnelEntryRow` list with collapsed summary cards
- Each collapsed card shows: **Name | Op hours | SB hours | Total | Date**
- Tapping a card expands it to show the full editable form (current PersonnelEntryRow content)
- Only one card expanded at a time (accordion-style) to keep things tidy
- Add the collapsed/expanded state to `PersonnelEntryRow` with a new `collapsed` prop or internal toggle

**PersonnelEntryRow.tsx changes:**
- Wrap current content in a collapsible section
- Add a summary header that's always visible: crew name, total hours, date
- Tap header to toggle expand/collapse
- Show a chevron indicator

**ShiftTicketForm.tsx changes:**
- Track which personnel index is expanded (default: none or first)
- Keep bulk time entry above the collapsed list (unchanged)

### 2. OF-297 Form Preview for Supervisor Signing (New Component)

Create a new component `OF297FormPreview.tsx` that renders an HTML visual replica of the OF-297 form layout, populated with the current ticket data. This is shown when the supervisor taps to sign.

**Flow:**
- When "Tap to sign" is pressed for supervisor, instead of going straight to signature canvas, show a full-screen modal with:
  - A scrollable, read-only OF-297 form preview (styled to look like the paper form)
  - All header fields, equipment entries, personnel entries, and remarks filled in
  - At the bottom: supervisor name/RO# inputs and the "Tap to sign" button
- Once they review and tap sign, it opens the existing SignaturePicker
- After signing, the signature appears on the form preview, and the user can close

**OF297FormPreview layout:**
- White background, black borders, table-based grid mimicking the paper form
- Header row: Agreement#, Contractor Name, Resource Order#, Incident Name, Incident#, Financial Code
- Equipment info row: Make/Model, Type, Serial/VIN, License/ID
- Options row: Transport Retained, First/Last, Miles
- Equipment table: Date | Start | Stop | Total | Qty | Type | Remarks
- Personnel table: Date | Name | Op Start | Op Stop | SB Start | SB Stop | Total | Remarks
- Remarks section
- Signature section at bottom with contractor and supervisor blocks

**ShiftTicketForm.tsx changes:**
- Add state `showSupervisorPreview`
- When supervisor "Tap to sign" is pressed, set `showSupervisorPreview = true`
- Render `OF297FormPreview` as a full-screen overlay
- Pass all current form data + signature handlers

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/shift-tickets/OF297FormPreview.tsx` | **Create** -- HTML replica of OF-297 for supervisor review |
| `src/components/shift-tickets/PersonnelEntryRow.tsx` | **Modify** -- Add collapsible summary/expand toggle |
| `src/components/shift-tickets/ShiftTicketForm.tsx` | **Modify** -- Track expanded personnel index; wire supervisor preview flow |

### Technical Details

- OF297FormPreview uses plain HTML/CSS tables with Tailwind to replicate the paper form grid -- no canvas or PDF rendering needed, just a visual read-only layout
- The preview is a full-screen modal (`fixed inset-0 z-50`) with `overflow-y-auto` for scrolling
- Personnel collapse uses simple state toggle, no external accordion library needed (just conditional rendering)
- No database changes required

