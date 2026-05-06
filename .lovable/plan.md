## Problem

The `ShiftTicketImportSheet` and its parser exist and work, but no UI ever opens them. `ShiftTicketForm.tsx` imports the sheet and declares `showImportSheet` state, but never renders the sheet and never exposes a trigger. Result: users have no way to import a photo/PDF of a paper OF-297 anywhere in the app.

## Goal

Make "Import paper ticket" a first-class, visible action everywhere a user enters or starts a shift ticket — without disrupting the existing manual flow.

## Where it needs to appear

1. **Inside the shift ticket form itself** (`ShiftTicketForm.tsx`) — used by both `ShiftTicketCreate` and `ShiftTicketEdit`. Primary place.
2. **Incident → Tickets tab** (`IncidentTicketsTab.tsx`) — next to "New Shift Ticket".
3. **Truck → Shift Tickets section** (`ShiftTicketSection.tsx`) — next to "New Ticket".
4. **Shift Ticket Quick Access dashboard widget** (`ShiftTicketQuickAccess.tsx`) — secondary action next to "Start New Shift Ticket".

## Changes

### 1. `ShiftTicketForm.tsx`
- Add a compact **"Import from photo/PDF"** button in the title row (right side, near Refresh), shown only when `!editingLocked`. Icon: `Camera` + label "Import paper ticket".
- Render `<ShiftTicketImportSheet>` at the bottom of the form (alongside other sheets), wired to `showImportSheet`, `organizationId`, and the existing `handleImportApply`.
- When the form mounts with `location.state.openImport === true`, auto-open the sheet (so external "Import" buttons can route into the form and pop the sheet immediately).

### 2. `IncidentTicketsTab.tsx`
- Convert the single "New Shift Ticket" button into a row: primary **"New Shift Ticket"** + secondary **"Import paper ticket"** (outline button, same width on mobile, side-by-side on wider).
- Import handler: same truck-resolution logic as `handleNewClick`, then `navigate(..., { state: { ..., openImport: true } })`.

### 3. `ShiftTicketSection.tsx` (truck-level)
- Add a small **"Import"** ghost button next to the existing "+ New Ticket" pill, navigating to the same `/new` route with `state.openImport = true`.

### 4. `ShiftTicketQuickAccess.tsx`
- Add a secondary **"Import paper ticket"** button under "Start New Shift Ticket" CTA. Reuses the same incident/truck resolution as `handleStartNew`, then routes with `state.openImport`.
- In the per-truck `TruckCard` (the one with `onNewTicket`), add a second small "Import" link beside "New ticket for this truck".

### 5. No changes needed to
- `ShiftTicketImportSheet.tsx` (already complete)
- `services/shift-ticket-import.ts` (already complete)
- `parse-shift-ticket` edge function (already deployed)

## UX details

- Label everywhere: **"Import paper ticket"** (clear, distinguishes from manual entry).
- Icon: `Camera` (matches the field-use mental model — snap a photo).
- Button style: outline / secondary so it doesn't compete with the primary "New" CTA.
- On mobile (primary target), buttons stack full-width; on wider, they sit side-by-side.
- In the form, the button is hidden once `editingLocked` (signed/finalized tickets) to avoid implying you can overwrite a locked ticket.

## Test checklist

- From Incident → Tickets tab: tap "Import paper ticket" → form opens with import sheet already showing.
- From a Truck's shift ticket section: same.
- From Dashboard quick access: same.
- Inside an existing draft ticket: button visible in header; tapping opens sheet; applying parsed data fills empty fields without wiping user input (existing `fill-empty` mode).
- Locked/signed ticket: button hidden.
- Cancel / close sheet: returns to form with no state changes.
