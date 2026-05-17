## Goal

Let a crew member fill out a shift ticket and capture the incident supervisor's signature **even with no service**, save it on the phone, and have it automatically push to the server the moment the phone is back online. Works inside the Despia-wrapped iOS/Android build with no changes to the wrapper.

## Feasibility

Very doable. The app already has most of the plumbing — it just hasn't been wired through for shift tickets:

- React Query cache is already persisted to IndexedDB (works in Despia/WKWebView).
- An offline mutation queue (`src/lib/offline-queue.ts`) already exists with replay-on-reconnect, 72-hour TTL, retry/backoff, and a "synced X changes" toast.
- The offline banner + online/offline detection already work.

What's blocking shift tickets specifically:
1. `useCreateShiftTicket` / `useUpdateShiftTicket` call `assertOnlineForWrite()`, so they hard-block when offline (intentional Phase-0 guard).
2. Signatures are uploaded to Supabase Storage and the **URL** is stored on the ticket. Storage uploads can't queue the same way row writes can, so signatures need to be cached locally as base64 and uploaded during sync.

No Despia/native changes required. IndexedDB + the existing queue are enough.

## Plan

### 1. Local signature cache
- Add `src/lib/offline-signatures.ts` using `idb-keyval`: `saveLocalSignature(blob) → "local-sig://<uuid>"` and `getLocalSignature(localId) → Blob`.
- `SignatureCanvas` / `SignaturePicker` callers: when offline, store the blob locally and write the `local-sig://...` placeholder onto the ticket's `contractor_rep_signature_url` / `supervisor_signature_url` instead of uploading.
- `ReceiptViewer`-style preview components that render signatures: if URL starts with `local-sig://`, resolve to a blob URL from IndexedDB so the user sees their signature immediately.

### 2. Enable offline writes for shift tickets only
- In `useCreateShiftTicket` / `useUpdateShiftTicket`: replace `assertOnlineForWrite()` with an "offline-aware" branch:
  - If online → behave exactly as today (no behavior change).
  - If offline → optimistically write the ticket into the React Query cache with a temp UUID and `enqueue()` an insert/update into the offline queue.
- Keep `assertOnlineForWrite()` everywhere else (incidents, crew, expenses, etc.) — scope is **shift tickets only** so we don't accidentally break other flows.

### 3. Sync engine for shift tickets
- Extend `replayQueue()` (or wrap it) with a shift-ticket-aware step that runs **before** the row replay:
  1. For each queued shift-ticket payload, scan signature URL fields.
  2. If a value is `local-sig://<id>`, pull the blob from IndexedDB, upload it to the `signatures` bucket, then swap the URL on the payload before the row insert/update runs.
  3. If upload fails → leave the mutation in the queue, increment attempts, surface the same "sync issues" toast we already have.
- On success: invalidate `shift-tickets`, `shift-tickets-recent`, `incident-daily-crew` query keys so the screen refreshes.

### 4. UI feedback (small, non-disruptive)
- On the ticket form, when saved offline, show "Saved on device — will sync when back online" instead of the current blocking toast.
- The existing amber offline banner and "Synced N changes" toast cover the rest.

### 5. Guardrails
- 72-hour TTL stays (already in queue) — prevents stale tickets from syncing weeks later.
- Max 5 retry attempts (already in queue) — failed tickets surface in Settings → Sync issues for manual review.
- Temp UUIDs generated client-side so the optimistic row and the eventual server row share an id (no duplicate-ticket risk on replay).

## What this does NOT change

- No edits to Capacitor/Despia config, no native plugins added, no app-store resubmission required beyond the normal app update.
- No change to online behavior — existing online users see zero difference.
- No change to other modules (incidents, crew, expenses) — they keep the strict offline block until we explicitly extend this pattern later.

## Effort

Small/medium. One focused session: ~3–5 files touched (signature cache, two hooks, queue extension, signature preview helper) plus a smoke-test pass with airplane mode on a physical device.

## Test plan

1. Online: create + sign + save a ticket → unchanged behavior, PDF renders.
2. Airplane mode: create + sign + save → toast "Saved on device", ticket visible in list with a "pending" indicator.
3. Turn wifi back on → "Synced 1 change" toast, ticket now has a real signature URL, PDF export works.
4. Airplane mode + force-quit + relaunch → ticket still there, syncs on next online event.
