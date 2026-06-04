# Restore Shift Tickets + Prevent Duplicate-Incident Mistakes

## What happened

- An incident for the same resource order was created twice.
- 3 shift tickets were filed under incident A; the signed PDFs were emailed out through incident B's thread.
- Incident A was later deleted. `incident_trucks` and `shift_tickets` cascade on incident delete, so the 3 tickets were hard-deleted (only `c1799b00` on the surviving incident is still present, soft-deleted).
- The 3 signed PDFs still exist in storage as attachments on outbound messages in the surviving incident `9b9ca1aa…` / truck `ed22a43b…` (DL62).

PDFs to recover (all on truck DL62 of "2026 Long Term Severity"):

| Sent | Storage path |
|---|---|
| 2026-06-02 13:23 | `…/shift-tickets/fceed0fc-…-1780406590864.pdf` |
| 2026-06-02 13:34 | `…/shift-tickets/fceed0fc-…-1780407279163.pdf` |
| 2026-06-03 12:44 | `…/shift-tickets/77d9c548-…-1780490668813.pdf` |

The 2026-06-02 pair is the same ticket re-sent — only one row should be created for it.

---

## Part 1 — Restore the tickets (no UI, one-time recovery)

Server-side script (`scripts/recover-lts-shift-tickets.ts`) run once locally via Deno/Node against the service role:

1. For each of the 3 attachments, sign the storage URL and invoke the existing `parse-shift-ticket` edge function to extract structured fields.
2. Deduplicate: if two parsed payloads share the same `shift_date` / equipment hours, keep one.
3. Insert into `shift_tickets` with:
   - `incident_truck_id` = `ed22a43b-a4bf-472e-80a9-dc901f7660ff`
   - `organization_id` = surviving incident's org
   - `status` = `submitted`
   - All parsed text fields (incident name/number, agreement #, equipment & personnel entries, remarks, miles, etc.)
   - `contractor_rep_name` / `supervisor_name` from the PDF text
   - `contractor_rep_signed_at` / `supervisor_signed_at` ≈ the original email `sent_at` (signatures are baked into the PDF; no signature image URL is recreated)
   - `paper_ticket_photo_url` = signed URL of the original PDF, so the finalized PDF is reachable from the ticket detail view
4. Back-link each restored row to its source message by updating `messages.system_event` note (audit only, no schema change).
5. Log a row per recovery into `incident_document_audit` with `event_type='ticket_recovered'`.

No new UI is exposed. The tickets simply appear in the truck's shift-ticket list as already-submitted entries with the original PDF attached.

## Part 2 — Remove the "Restore as shift ticket" button

Revert the prior change:
- `src/components/messages/AttachmentChip.tsx` — remove the recovery button and its handler.
- `src/components/messages/MessageBubble.tsx`, `src/pages/ThreadView.tsx` — remove the thread/incident-truck context props that were added only to feed that button.
- `src/services/shift-tickets.ts` — remove `recoverShiftTicketFromPdfAttachment`.

## Part 3 — Safeguards against this happening again

### 3a. Resource-order uniqueness (primary fix)

Migration adding a partial unique index plus a friendly pre-check:

```text
unique (organization_id, lower(trim(resource_order_number)))
where resource_order_number is not null
on table resource_orders
```

And a SECURITY DEFINER helper `find_existing_incident_truck_for_ro(org_id, ro_number)` used by the client.

### 3b. UI guard at incident creation

When the user starts a new incident or assigns a truck and enters a Resource Order #:
1. Call the helper above before insert.
2. If a match exists, block the create flow with a modal:
   > "Resource Order #2026-PNW-1234 is already attached to **2026 Long Term Severity → DL62** (opened May 31). Open that incident instead?"
   Buttons: **Open existing incident** / **Cancel** / *(hidden behind an "Override" link for true edge cases — confirms with a typed reason that's written to `incident_document_audit`).*

### 3c. Cross-incident send guard

In every outbound email composer (shift tickets, OF-286, factoring, demob):
- Compare the `thread.incident_id` / `thread.incident_truck_id` to the document's `incident_truck_id`.
- If they differ, refuse to send and surface:
  > "This document belongs to **Incident A / DL62** but you're sending from a thread in **Incident B**. Pick a thread on the document's incident."
- Same check server-side in the send edge function as a backstop.

### 3d. Soft-delete for incidents & cascade safety

Migration:
- Add `deleted_at`, `deleted_by_user_id`, `deleted_reason` to `incidents` and `incident_trucks` (same pattern already on `shift_tickets`).
- Change the delete UI to soft-delete (30-day window) instead of hard delete; filter `deleted_at IS NULL` everywhere.
- Hard-delete only via an admin "Permanently delete" action that lists what will be lost (truck count, ticket count, doc count, message count) and requires typing the incident name.

This means even if step 3a–3c are bypassed in the future, nothing is silently lost.

---

## Technical notes

- `shift_tickets` already has FK `ON DELETE CASCADE` from `incident_trucks` → that's why the rows vanished. Soft-delete on `incidents`/`incident_trucks` plus filtered selects is the durable fix; we keep the cascade so true hard-deletes still clean up.
- `resource_orders.resource_order_number` is currently free-text and nullable; the unique index is partial so legacy/blank rows aren't affected.
- The recovery script uses the service role and is not checked into client bundles; it lives under `scripts/` and is run once.
- No schema change is needed on `shift_tickets` for Part 1 — we reuse `paper_ticket_photo_url` to point at the original signed PDF.

## Files touched

- New: `scripts/recover-lts-shift-tickets.ts`
- New migration: resource-order unique index + incident/incident_truck soft-delete columns + helper function
- Edit: `src/components/messages/AttachmentChip.tsx`, `MessageBubble.tsx`, `src/pages/ThreadView.tsx`, `src/services/shift-tickets.ts` (remove recovery button)
- Edit: incident-create flow (`src/pages/incidents/NewIncident*.tsx` / truck-assign dialog) — RO duplicate check
- Edit: outbound send paths (shift ticket / OF-286 / factoring / demob send buttons + corresponding edge functions) — cross-incident guard
- Edit: incident delete UI + list queries — soft-delete filter

## Out of scope

- Migrating historical free-text RO numbers to a normalized format.
- Merging duplicate incidents that already exist (manual cleanup if any are found).
