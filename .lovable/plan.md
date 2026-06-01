# Messaging cleanup + global inbox upgrade

## Problems observed

1. **Incident tab leaks global threads.** Threads with `incident_id = null` (e.g. "TEST", "Lovable inbound test", and any thread created without an incident link) are appearing inside an incident's Messages tab. The `listThreads` filter is `eq("incident_id", incidentId)`, so it shouldn't, but inbound replies and red-card threads sometimes attach to a different `incident_truck_id` whose `incident_id` was inferred wrong, and threads without `incident_id` are also flowing through other paths. We'll audit and tighten.
2. **OF-286 from Joney (Ash Pole) is not visible in /messages.** The inbound OF-286 was attached to thread `0ac8ebcf…` whose `purpose='shift_ticket'` and subject `"Shift Ticket — Ash Pole 2026-05-27"`. There's an `app_notifications` row `"OF-286 needs review & signature"` linked to it, but in the inbox the thread reads as a shift ticket with no visible attachment-to-sign affordance — so the user can't find or act on it.
3. **No grouping/search in /messages.** Hard to find anything once there are dozens of shift-ticket threads.

## What we'll build

### 1. Incident-scoped tab — strict filter
- In `MessagesInbox`, when `incidentId` is set, only show threads where `incident_id === incidentId`. (Already in SQL — add a defensive client-side filter, and confirm no caller passes `showCompose` without `incidentId`.)
- Also surface threads attached only via `incident_truck_id`: extend `listThreads` to also match `incident_truck_id` belonging to that incident (via `incident_trucks.incident_id = :incidentId`). This catches red-card / shift-ticket threads created against a truck without `incident_id` set.

### 2. Global inbox — group by incident + search
On `/messages`:
- **Search bar** (sticky, top): filters by `subject`, `from_name`, `from_email`, `last_snippet` (client-side over the loaded list — already capped at 200).
- **Grouping toggle**: "By incident" (default) / "Flat".
  - By incident: collapsible sections per `incidents.name`, plus a "No incident" group at the bottom for general/inbound-unmatched threads.
  - Flat: existing chronological list.
- Thread row gets an **attachment badge** (paperclip + count) when the thread's last message — or any message — has attachments, so OF-286/red-card/shift-ticket attachments are discoverable at a glance.

### 3. Attachment-aware thread row + "Needs signature" affordance
- `ThreadListItem` shows:
  - existing subject + snippet + unread dot
  - new: paperclip + count if attachments exist
  - new: pill **"Needs signature"** when a linked `incident_documents` row of type `of286` is `stage='original'` (or unsigned) and belongs to this thread. Tapping the thread opens `ThreadView` where the attachment chip already links to the signing flow (no changes to signing itself in this pass).
- To power this in one query, extend `listThreads` to also fetch:
  - `message_attachments` count per thread (single grouped query),
  - any `incident_documents` rows where `thread_id IN (...)` and `document_type='of286'` and not yet signed.

### 4. Small polish
- More → Messages entry stays; add unread total badge styling parity with tab bar.
- Empty state copy updated: "Replies, OF-286s, demob acks, and red-card threads will show up here."

## Technical notes

- All changes are frontend + one service function update in `src/services/threads.ts`. No schema changes, no migrations.
- Files touched:
  - `src/services/threads.ts` — extend `listThreads` (incident_truck join, attachment count, unsigned of286 flag).
  - `src/components/messages/MessagesInbox.tsx` — search input, group-by-incident toggle, grouped render.
  - `src/components/messages/ThreadListItem.tsx` — paperclip count + "Needs signature" pill.
  - `src/pages/MessagesInbox.tsx` — pass `showCompose={false}` (global inbox composes from an incident context anyway) and render the new header controls.
- Realtime invalidation already in place via `useThreadList`.

## Out of scope (this pass)
- Changing how OF-286 signing actually works (still happens from the existing thread/document flow).
- Adding push notifications or email digest.
- Changing how inbound emails get routed to a thread.
