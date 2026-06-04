# Soft-delete incidents + Cross-incident send guard

## Part 1 — Soft-delete for incidents (and incident trucks)

### Goal
Make incident/truck delete recoverable. A fat-finger no longer cascades shift tickets, OF-286s, expenses, messages, etc. into the void.

The `deleted_at` / `deleted_by_user_id` / `deleted_reason` columns are already in place from the prior migration.

### Behavior

- **"Delete incident"** in `IncidentDetail` becomes **"Move to Trash"**:
  - Sets `deleted_at = now()`, `deleted_by_user_id = auth.uid()`, optional `deleted_reason`.
  - No row cascade. Shift tickets, trucks, docs, threads all stay intact.
  - Confirmation dialog summarizes what will be hidden (truck count, ticket count, doc count, message count, expense count) so the user knows what they're "removing".
  - Toast on success: **"Moved to Trash. Restore from Settings → Trash within 30 days."** with an inline **Undo** action (5 sec).
- **"Delete truck assignment"** in the truck detail / IncidentDetail truck list: same pattern — soft-delete `incident_trucks` row, no cascade, restorable.
- Hide soft-deleted rows everywhere:
  - All `from("incidents").select(...)` and `from("incident_trucks").select(...)` queries get a `.is("deleted_at", null)` filter. The audited callsites are listed in **Files touched**.
  - Realtime / dashboards already use these selects — same filter.
- **Trash page** at `/settings/trash`:
  - Tabs: **Incidents** / **Truck assignments**.
  - List shows name, who deleted, when, and how many days remain (30 − age).
  - Actions per row: **Restore** (clears `deleted_at`), **Permanently delete** (true hard delete; requires typing the incident/truck name; logs to `incident_document_audit` with `event_type='hard_deleted'` and a payload count summary).
- **Auto-purge job** (deferred — out of scope this turn): nightly cron via `pg_cron` to hard-delete rows older than 30 days. For now, "30 days" is a UX promise enforced manually by Permanently Delete.
- RLS already allows org members to update incidents (engine boss / admin); restore uses the same path. No new policies needed.

### Why no policy change

Soft-deleted rows remain visible to RLS — the UI just filters them out. This keeps the implementation a one-line `.is("deleted_at", null)` in queries plus the Trash page that intentionally omits the filter.

## Part 2 — Cross-incident send guard

### Goal
Refuse to send any document via a thread that doesn't belong to the document's incident/truck. This is the actual root cause of the duplicate-incident pain: PDFs from Incident A were emailed through Incident B's thread.

### Edge function changes

**`send-thread-reply`** (used by shift tickets, OF-286 replies, demob, and regular replies):
- Accept new optional body fields:
  - `source_incident_truck_id?: string`
  - `source_incident_id?: string`
  - `source_document_label?: string` (e.g. `"Shift Ticket 2026-06-02"`, used only for the error message)
- After loading `thread`, validate:
  - If `source_incident_truck_id` provided and `thread.incident_truck_id` differs → return 422 with:
    ```
    {
      error: "incident_mismatch",
      detail: "This Shift Ticket 2026-06-02 belongs to incident truck X but this thread belongs to incident truck Y. Choose a thread on the correct truck.",
      thread_incident_id, thread_incident_truck_id,
      source_incident_id, source_incident_truck_id
    }
    ```
  - If `source_incident_id` provided and `thread.incident_id` differs (and no truck constraint matched) → same 422.
- Log the rejection to `incident_document_audit` with `event_type='send_blocked_wrong_incident'`.
- Plain user replies (no source ids passed) keep working unchanged.

**`send-factoring-submission`**:
- Body already includes `incident_id`. Add a guard at the top: load any thread that would be used, and confirm `incident_id` matches the surviving `incidents` row's org. For factoring there is no thread routing today, so the guard here is simpler: just refuse if the incident is soft-deleted (`deleted_at IS NOT NULL`).

### Client changes

- **`src/services/threads.ts → sendReply`**: extend signature to optionally accept `{ sourceIncidentTruckId?, sourceIncidentId?, sourceDocumentLabel? }`. When present, pass through to the edge function.
- **`SendShiftTicketDialog`** (`src/components/shift-tickets/SendShiftTicketDialog.tsx`): pass the ticket's `incident_truck_id` and a label `"Shift Ticket {date}"`.
- **`OF286UploadCard`** (`src/components/incidents/OF286UploadCard.tsx`): pass `incident_truck_id` of the OF-286 and label `"OF-286 {file_name}"`.
- **`FactoringSubmitCard`**: pass `incident_id` to the factoring send.
- **`NewThreadSheet`**: if it's pre-attaching a document (it can attach files when creating a thread), pass through any source ids it has — for plain new threads with no source doc, no guard fires.
- **UI affordance**: when the user picks a thread in `SendShiftTicketDialog` / `OF286UploadCard` and the thread's `incident_truck_id` doesn't match the document, disable the **Send** button and show:
  > "This thread belongs to **{other-incident-name}**. Pick a thread on **{this-incident-name}** or create a new one."
  with a **Create new thread on this incident** shortcut. The server-side guard is the backstop.

## Files touched

**Part 1**
- `src/services/incidents.ts` — `deleteIncident` becomes `softDeleteIncident`, add `restoreIncident`, `hardDeleteIncident`, `fetchTrashedIncidents`. All `fetchIncidents` / `fetchIncident` get `.is("deleted_at", null)`.
- `src/services/incident-trucks.ts` — same pattern for `incident_trucks`.
- `src/hooks/useIncidents.ts` — update mutation hook names + add restore/hard-delete hooks.
- `src/pages/IncidentDetail.tsx` — relabel button, update confirm dialog with counts + Undo toast.
- `src/pages/Incidents.tsx` (list) and other selects in `src/services/reports/*.ts`, `src/components/messages/NewThreadSheet.tsx`, `src/components/fleet/InspectionDueBanner.tsx` — add `.is("deleted_at", null)` filter on `incidents` selects. Same for `incident_trucks` queries.
- New: `src/pages/SettingsTrash.tsx` + route `/settings/trash` + entry in Settings.

**Part 2**
- `supabase/functions/send-thread-reply/index.ts` — accept + validate source ids.
- `supabase/functions/send-factoring-submission/index.ts` — refuse on soft-deleted incident.
- `src/services/threads.ts` — extend `sendReply`.
- `src/components/shift-tickets/SendShiftTicketDialog.tsx` — pass source ids + UI disable on mismatch.
- `src/components/incidents/OF286UploadCard.tsx` — pass source ids.
- `src/components/incidents/FactoringSubmitCard.tsx` — pass incident id (already does, just ensure guard in function).
- `src/components/messages/NewThreadSheet.tsx` — pass source ids when attaching a doc.

## Out of scope

- `pg_cron` auto-purge of rows past 30 days (UI-only purge for now).
- Soft-delete for `shift_tickets` (already has `deleted_at` — the cascade still hard-deletes them when an `incident_truck` row is hard-deleted, but moving the truck delete to soft-delete fixes that path).
- Migrating any existing hard-deleted data — unrecoverable.
- Adding the same cross-incident guard to inbound replies (`incoming-email` function) — inbound mail is already routed by thread_token.

## Testing notes (manual)

1. Soft-delete an incident with trucks/tickets → it disappears from lists, Trash shows it, restore brings it back with all data intact.
2. Attempt to send a shift ticket via a thread on a different incident → Send button disabled with helpful copy; if forced via API, server returns 422 with `incident_mismatch`.
3. Send a normal reply (no source ids) → unchanged behavior.
