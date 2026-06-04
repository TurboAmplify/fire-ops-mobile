## What's actually happening

I pulled the threads for incident `2026 Long Term Severity` and confirmed two separate issues — neither is the edge function sending the same email twice.

**Issue 1 — duplicate-looking threads, not duplicate emails**

For the 2026-06-03 ticket on truck `ed22a43b…` there are **three** shift_ticket threads, each with exactly one outbound message:

| Time | To | Thread |
|---|---|---|
| 13:26 | dawn_hernandez@firenet.gov | 5201400b |
| 14:21 | loren.dragg@bia.gov | a1cdc059 |
| 14:23 | loren.dragg@bia.gov | 5cc308a0 |
| 14:25 | loren.dragg@bia.gov | 5687a613 |

So one email per thread (no Resend-level dup), but:
- Picking contacts one at a time creates a new thread per contact (current dialog always calls `createThread` on Send).
- Three sends to loren within four minutes means the "Already sent" guard wasn't strong enough — it only warns and relies on a checkbox; rapid re-clicks of Send still go through.

**Issue 2 — preview shows our own org, not the recipient**

`listThreads` derives `counterparty_name` / `counterparty_email` from the **last message's `from_email`**. For outbound messages that's our own `email_handle@mail.fireopshq.com`, so the inbox row reads as our own org name instead of "To: dawn@firenet.gov". The `to_emails` array on the message is never read.

## Fix

### 1. Consolidate shift-ticket threads (one thread per truck + ticket date)

In `SendShiftTicketDialog.handleSend`:
- Call `findShiftTicketThreads({ incidentTruckId, ticketDate })` and **reuse** the most-recent thread if one exists for this truck+date, instead of always creating a new one.
- Only create a new thread when none exists.
- Pass all selected recipients via `to_emails` override (already wired) so a multi-contact send stays one message on one thread, and a later send for the same ticket appends to the same thread.

### 2. Harden the re-send guard

- Track "last sent at" from `findShiftTicketThreads`. If the most recent send to **any** selected recipient was within the last 10 minutes, show a stronger warning ("Sent X min ago — likely duplicate") and require the existing confirm checkbox.
- Disable the Send button for the entire async flow (`loading` already guards this — verify there's no path that re-enables it before the await completes; add an immediate `setLoading(true)` at the very top, before the recipient validation toasts).

### 3. Show recipients in the inbox preview

Update `listThreads` in `src/services/threads.ts` and `ThreadListItem.tsx`:
- Also select `to_emails`, `direction` on the last-message lookup.
- New field `counterparty_label`:
  - If last message direction = `out` → `"To: <name or email>"` (join up to 2, then `+N more`).
  - If `in` → keep current `from_name || from_email`.
- For shift_ticket / demob / of286 threads where multiple recipients exist, prefer the contact display names from `incident_truck_finance_contacts` by joining on email (fallback to the raw email).
- Render the new label in `ThreadListItem` instead of the current `counterparty_name || counterparty_email`.

### Files to touch

- `src/components/shift-tickets/SendShiftTicketDialog.tsx` — reuse-or-create thread, harden guard.
- `src/services/threads.ts` — extend `ThreadListItem` shape with `counterparty_label`, query `to_emails` + `direction`, optionally join finance contacts for nicer names.
- `src/components/messages/ThreadListItem.tsx` — render new label, prefix with "To:" for outbound-last threads.

### Out of scope

- No edge-function changes — `send-thread-reply` already de-dupes recipients and persists one message per call. The dup problem is at the thread-creation layer, not the send layer.
- No schema changes.

## Verification after build

- Send the same shift ticket twice to different contacts → expect ONE thread in the inbox with both recipients listed in the preview.
- Try to re-send within 10 min → expect the stronger warning + required confirm.
- Inbox row for a sent thread should read `To: Dawn Hernandez` (or `To: Dawn Hernandez +1`), not the org name.
