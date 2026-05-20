# Plan #2 — Messaging Inbox + Thread View

## Goal
Surface the existing messaging backend (`communication_threads`, `messages`, `message_attachments`, `message_drafts`, `send-thread-reply`, `incoming-email`) as a real, mobile-first UI. This is the foundation for Plans #3 (demob send/ack) and #4 (OF-286 review), both of which send to finance and receive replies through these same threads.

## Scope guardrails (golden rules)
- No backend rewrites. Use existing tables + edge functions as-is.
- Mobile-first (375px). ≤3 taps from inbox → open thread → reply.
- Loading / empty / error on every new view.
- Offline-tolerant reads (use existing query cache); writes blocked by existing `offline-guard`.
- No new bottom tab. Inbox surfaces in two places:
  1. **Incident Detail → new "Messages" tab** (per-incident thread list)
  2. **Global inbox entry** added to the **More** screen (cross-incident, sorted by `last_message_at`)
- Reuse shadcn primitives (Card, Tabs, Button, Textarea, Sheet, Badge). No new design system pieces.

## What changes for the user

### A. Global Inbox (`/messages`)
- Linked from `More` page row "Messages" with unread badge.
- List of threads org-wide, newest activity first.
- Each row: subject, counterparty name/email, snippet of last message, unread dot, relative time, purpose chip (shift / demob / of286 / general), incident name if linked.
- Tap → thread view.

### B. Per-incident Messages tab
- New tab on `IncidentDetail` between Tickets and Documents.
- Same list component as global inbox, filtered to `incident_id`.
- Empty state: "No messages yet" + "Start a thread" button (opens compose sheet).

### C. Thread view (`/messages/:threadId`)
- Header: subject, counterparty, purpose chip, "View incident →" link if linked.
- Scrollable message list (oldest → newest), bubbles styled by `direction` (in = neutral left, out = primary right).
- Each message: from name/email, sent/received time, body (sanitized HTML if present else text), attachment chips.
- Tap attachment → opens via signed URL (reuse `useSignedUrl`).
- Sticky bottom **Reply composer**: Textarea + attach button (later) + Send.
- On mount: mark thread read (`unread_count = 0`, last_read_at on user).
- Send → calls `send-thread-reply` edge function. Optimistic message append; failure shows toast + keeps draft.
- Auto-save draft to `message_drafts` (debounced 1s) so reply survives navigation.

### D. Compose new thread (sheet from incident Messages tab)
- Pick contact from `IncidentFinanceContactsCard` list (or "Add contact" → opens existing picker).
- Pick purpose (general / shift_ticket / demob / of286).
- Subject + body.
- On send: create `communication_threads` row (generate `thread_token`), then call `send-thread-reply` with the new id.

## Technical details

### New routes
- `/messages` → `MessagesInbox.tsx`
- `/messages/:threadId` → `ThreadView.tsx`

### New service: `src/services/threads.ts`
- `listThreads({ incidentId? })` — joins `incident.name`, last message snippet.
- `getThread(threadId)` — thread + ordered messages + attachments.
- `markThreadRead(threadId)` — update `unread_count = 0`.
- `createThread({ incidentId?, incidentTruckId?, contactId?, financeOfficerId?, purpose, subject })` — generates `thread_token` (uuid-derived, short), inserts row, returns id.
- `saveDraft(threadId, body)` / `getDraft(threadId)` — upsert/select `message_drafts`.

### New hooks: `src/hooks/useThreads.ts`
- `useThreadList({ incidentId? })` — react-query.
- `useThread(threadId)` — react-query + realtime subscription on `messages` filtered by `thread_id` to live-append inbound.
- `useSendReply()` — mutation calling `supabase.functions.invoke('send-thread-reply', ...)`.
- `useUnreadCount()` — sum of `unread_count` for badge in More.

### New components
- `src/components/messages/ThreadListItem.tsx`
- `src/components/messages/MessageBubble.tsx`
- `src/components/messages/ReplyComposer.tsx`
- `src/components/messages/AttachmentChip.tsx`
- `src/components/messages/NewThreadSheet.tsx`

### Edits
- `src/App.tsx` — register two new routes inside `ProtectedRoute`.
- `src/pages/More.tsx` — add "Messages" row with unread badge.
- `src/pages/IncidentDetail.tsx` — add `<TabsTrigger value="messages">` + content rendering `<MessagesInbox incidentId={...} variant="embedded" />`.
- `supabase/migrations/*` — add `thread_last_read` per-user table OR add `last_read_at` to `communication_threads` (single-reader simplification — pick the simpler path: clear `unread_count` on read, since orgs are small). No schema change required if we just zero `unread_count`. **Decision: no migration this plan.**

### Realtime
- Enable realtime publication for `messages` and `communication_threads` (1-line migration):
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_threads;
  ```

### Offline behavior
- Reads cached by react-query (already 7-day cache config).
- `Send` and `Save draft` gated by existing `offline-guard` — when offline, draft still saves locally to react-query cache; send shows "You're offline" toast.

## Files touched (estimate)
1. `supabase/migrations/*` (realtime publication only)
2. `src/services/threads.ts` (new)
3. `src/hooks/useThreads.ts` (new)
4. `src/components/messages/*.tsx` (5 new small components)
5. `src/pages/MessagesInbox.tsx` (new)
6. `src/pages/ThreadView.tsx` (new)
7. `src/App.tsx` (2 routes)
8. `src/pages/More.tsx` (Messages row + badge)
9. `src/pages/IncidentDetail.tsx` (Messages tab)

## What to test after build
1. More → Messages → empty state renders, no crash.
2. Trigger inbound email (or seed a thread row + message via SQL) → appears in inbox with unread dot.
3. Tap thread → messages render in order; unread dot clears.
4. Type reply → draft persists across navigation.
5. Send reply → message appears optimistically; `send-thread-reply` invoked; on success status flips to sent.
6. Open incident → Messages tab → same thread visible filtered by incident.
7. Compose new thread from incident → picks contact from new incident-level finance card → sends → thread appears in both inbox and incident tab.
8. Offline: send is blocked with toast; reading still works from cache.

## Out of scope (next plans)
- Demob packet builder & combined PDF (Plan #3)
- OF-286 review dashboard (Plan #4)
- Per-user `last_read_at` (current zero-on-open model is fine for small orgs)
- Attachment upload from composer (defer to Plan #3 where demob needs it)
