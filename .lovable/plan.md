

## Fix: Shift Ticket Auto-Population + Auto-Parsing on Upload

### What's changing from the prior plan

You're right on three points:
1. None of these tickets have a supervisor signature yet → they're all unlocked → backfill + refresh button can run on every existing draft.
2. Resource orders should auto-parse the moment they're uploaded (matches your real workflow — RO upload is usually how the incident kicks off).
3. The VIN photo on the truck should auto-parse and fill the truck's VIN field, so the shift ticket can then pull it in.

### The fix, in three layers

**Layer 1 — Auto-parse on upload (no extra taps)**

- **Resource Orders**: `ResourceOrderSection` already auto-parses on upload today, but it depends on the user being inside that section to trigger it. Verify that path actually fires after upload and surface a clear error toast if parsing fails — and add a small "Re-parse" affordance on already-uploaded but unparsed orders so the existing 7 ROs (including the Severity one) can be parsed in one tap.
- **VIN photos**: When a photo is uploaded to the truck and tagged as the VIN photo (or uploaded through a dedicated "Add VIN photo" flow), automatically call the existing `parse-truck-photo` edge function, extract the VIN, and write it to `trucks.vin` if the field is currently blank. Show a one-tap confirmation: "Detected VIN: 1FTXXX… — Save to truck?" so the user always confirms before it lands in the database.
- Both flows show a small "Parsing…" spinner in place and a success/failure toast. Failures never block the upload itself.

**Layer 2 — Shift Ticket auto-backfill from latest source data**

In `ShiftTicketEdit.tsx`, expand the `mergedTicket` memo to also load the latest parsed resource order for that incident_truck and fill any blank header field on the existing ticket from:
- **Truck row** → `equipment_make_model` (year + make + model), `equipment_type` (unit_type), `serial_vin_number` (vin), `license_id_number` (plate)
- **Latest parsed RO** → `agreement_number`, `resource_order_number`, `incident_number`, `financial_code`, `incident_name`, `contractor_name`

Rules:
- Only fills blanks. Never overwrites user-entered values.
- Runs every time the ticket is opened, so updating a truck's VIN today instantly lights up all 7 unsigned drafts on the Severity incident.
- `handleSave` persists the merged values so PDFs and downstream views stay consistent.

**Layer 3 — Manual refresh + visual hints (safety net)**

- Add a **"Refresh from Truck & Resource Order"** button in the ticket form header. Re-pulls the latest truck + RO data and overwrites blank fields. Useful if the user updates the truck after opening the ticket.
- Inline hints under blank fields:
  - VIN blank + truck VIN blank → "Add VIN on the truck profile or upload a VIN photo to auto-fill."
  - RO # blank + RO unparsed → "Resource order has not been parsed yet — tap Parse on the resource order."

### What this fixes for the Severity incident specifically

Once Layer 1 ships:
1. Open the existing DL62 resource order on Severity → tap **Parse** (one tap) → all 7 unsigned drafts auto-fill agreement #, RO #, incident #, financial code on next open.
2. Open the DL62 truck → upload (or re-tag) the VIN photo → VIN auto-extracts, you confirm, it saves → all 7 unsigned drafts auto-fill VIN on next open.
3. DL61: enter plate/year/make/model manually one time on the truck profile (no photo to parse from). Same auto-fill cascade.

### Files touched

**Code**
- `src/pages/ShiftTicketEdit.tsx` — expand merge to include RO + full truck data, persist on save, wire refresh handler
- `src/components/shift-tickets/ShiftTicketForm.tsx` — refresh button + blank-field hints
- `src/components/incidents/ResourceOrderSection.tsx` — verify auto-parse runs reliably on upload, add re-parse button for unparsed orders, clearer error states
- `src/components/fleet/TruckPhotoSection.tsx` (or `TruckHeroPhoto.tsx`, whichever owns VIN photos) — trigger `parse-truck-photo` after upload when photo is tagged as VIN, write extracted VIN back to truck after user confirmation
- `src/services/fleet.ts` — small helper to update only `trucks.vin`

**No DB changes, no new edge functions** — `parse-resource-order` and `parse-truck-photo` already exist and work.

### Out of scope

- Backfilling tickets that already have a supervisor signature (none exist on Severity, so moot today; if any get signed before this ships, they'll stay as-is — by design).
- Re-running OCR on already-uploaded VIN photos in bulk. The user re-tags or re-uploads to trigger.
- UI redesign of the ticket form.

