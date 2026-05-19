
## What's broken

### 1. Les — reset password shows a spinning wheel forever
The reset-password page only flips its `ready` flag in two cases:
- A `PASSWORD_RECOVERY` event fires on `onAuthStateChange`, or
- The URL hash contains `type=recovery`

Supabase has moved password recovery to the **PKCE flow**. The email link now goes to `/verify?token=...`, which 303-redirects to `/reset-password?code=...` (a query param, **not** a hash, and **no** `type=recovery`). Our page never sees either signal, so `ready` stays `false` and we just show the spinner.

The auth logs confirm this: `GET /verify ... status 303` followed by a second click that returned `email link has expired` (because PKCE codes are single-use).

### 2. Nevaeh — "offline" + looping while saving a shift ticket
Every write hook calls `assertOnlineForWrite()`, which throws purely based on `navigator.onLine`. In the iOS WebView / Despia wrapper, `navigator.onLine` is unreliable and frequently reports `false` even on a working connection. When that happens:
- The mutation throws `OfflineWriteBlockedError` immediately.
- The `OfflineBanner` shows the amber "Offline" bar.
- The user retries, gets the same error, and the page feels stuck.

### 3. Preview "jumping"
The Lovable preview wrapper is sending `RESET_BLANK_CHECK` messages and Vite logs `server connection lost. Polling for restart…` every ~1.6s. This is preview-shell behavior — it does **not** happen on the published app — but a hard reload of the preview should be done after the fixes land so we can confirm.

---

## The fix

### A. Make `/reset-password` work with PKCE codes
Update `src/pages/ResetPassword.tsx`:
- On mount, look for a `code` query param. If present, call `supabase.auth.exchangeCodeForSession(code)`; on success, set `ready = true`, on failure show a clear "link expired — request a new one" message with a button back to the forgot-password screen.
- Keep the existing `PASSWORD_RECOVERY` listener and `type=recovery` hash check as fallbacks for older links.
- Strip the `code` from the URL after exchange so a refresh doesn't try to reuse it.

### B. Stop falsely blocking writes when `navigator.onLine` lies
Update `src/lib/offline-guard.ts`:
- `assertOnlineForWrite()` should no longer throw purely on `navigator.onLine === false`. Instead let the write attempt go to Supabase and only treat it as offline if the underlying fetch actually fails (we already do this in `handleMutationError` via `isLikelyNetworkError`).
- Keep the `OfflineWriteBlockedError` class and `handleMutationError` so genuine network failures still produce a clean toast.

This is a small, safe change: in practice it removes the false-positive block and lets the real network decide. No new dependencies, no schema changes.

### C. Stop the `OfflineBanner` from flapping
Update `src/components/OfflineBanner.tsx` / `src/hooks/useNetworkStatus.ts`:
- Treat `navigator.onLine === false` as "possibly offline": only show the amber banner after the state has been false for ~2s continuously, and hide immediately on `online`. This kills the per-second flicker some users see in WebView and prevents the "Back online" green bar from popping repeatedly.

### D. Preview reload loop
After A–C ship, hard-refresh the preview tab once. If it keeps looping, that's the preview shell (not the app) and we'll need to publish + use `app.fireopshq.com` to verify Nevaeh's flow.

---

## Files I'll touch

- `src/pages/ResetPassword.tsx` — PKCE code exchange + expired-link UX
- `src/lib/offline-guard.ts` — `assertOnlineForWrite()` becomes a no-op (real failures handled downstream)
- `src/hooks/useNetworkStatus.ts` — debounce the offline state
- `src/components/OfflineBanner.tsx` — only react to the debounced state

No database migrations, no schema changes, no new packages.

## What to test after

1. Send Les a fresh password-reset email → click → land on `/reset-password` → set new password → sign in. No spinner.
2. Have Nevaeh open a shift ticket on a real device and save. It should save without the "offline" toast (assuming she actually has signal).
3. Toggle airplane mode on/off — the amber banner should appear after a brief delay and clear immediately on reconnect, no rapid flicker.
