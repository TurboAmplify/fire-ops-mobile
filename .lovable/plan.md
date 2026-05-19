## Goal
Stop the preview from looping / jumping. When I tested the live preview the dashboard loaded fine and showed the tutorial sheet at step 1, so the "loop" is a combination of (a) the tutorial sheet re-opening every time the page mounts, (b) effects that re-fire on every auth event, and (c) a noisy manifest/storage error that crashes things on slower mounts. We'll fix all of them, not just the first.

## Issues found and fixes

### 1. Tutorial auto-open re-triggers on every mount in the preview iframe
`src/hooks/useTutorial.tsx` guards auto-open with `sessionStorage`. The preview iframe is often re-created (new sessionStorage), so the welcome sheet pops up every time → looks like the screen is "jumping."

Fix:
- Persist the "auto-shown" guard in **localStorage** instead of sessionStorage (`fireops_tutorial_auto_shown_at`). It only needs to stop the *automatic* re-open; users can still replay from the help icon.
- Set the guard **before** the 700 ms timer (already done) and **also** the moment the sheet actually opens — belt and braces.
- Treat any non-null `tutorial_completed_at` as "don't auto-open ever again" and short-circuit before the timer.
- Drop the 700 ms delay to 0 ms when we're going to open anyway — the delay just prolongs the perceived jump.

### 2. AuthProvider wipes per-user state on first INITIAL_SESSION
`src/hooks/useAuth.tsx` initializes `lastUserIdRef` from `localStorage` then compares against the current session. Race: `onAuthStateChange` fires `INITIAL_SESSION` with `null` *before* `getSession()` resolves with the real user, so `identityChanged || isSignOut` is true and `wipeUserScopedClientState()` runs — clearing the query cache and the tutorial localStorage key on every cold load. This is why the tutorial keeps coming back even when previously dismissed.

Fix:
- Ignore the `INITIAL_SESSION` event when `session` is `null` and `lastUserIdRef` is set — only the real `getSession()` result should drive the first identity.
- Remove `fireops_tutorial_completed_at` from the wipe list. Tutorial completion is a UI preference, not user-scoped secret state; it's already keyed to the user via the `profiles.tutorial_completed_at` column. Keep wiping `active_org_id`, impersonation, and IDB cache.
- Skip the wipe entirely on `INITIAL_SESSION` when the session user id matches the stored `LAST_USER_KEY` — same user, nothing to wipe.

### 3. `OrganizationProvider` refetch loop
`useEffect(..., [user?.id, fetchMembership])` re-runs every time `fetchMembership` identity changes. `fetchMembership` is `useCallback(..., [user])` — the whole user object, which changes reference on each auth event even when id is stable. Result: membership refetches on every render of AuthProvider.

Fix:
- Change `fetchMembership` deps from `[user]` to `[user?.id]`.
- Change the secondary effect's deps from `[user, activeOrgId, allMemberships, fetchMembership]` to `[user?.id, activeOrgId, allMemberships, fetchMembership]`.

### 4. `ImpersonationProvider.startViewAs` deps include full `target` object
`useCallback(stopViewAs, [target, qc])` — `target` is a state object, so the callback identity flips on every change, cascading into any consumer that lists it as a dep. Low-impact today but contributes to re-render churn.

Fix:
- Use `setTarget((prev) => …)` and depend on `[qc]` only; capture `prev` from the setter for the audit log.

### 5. `useNetworkStatus` 5 s polling causes pendingCount churn
The 5 s `setInterval` calls `getQueueLength()`. When the queue length flips between cached value and IDB read, `setPendingCount` re-renders every consumer (OfflineBanner, AppShell, etc.). Combined with React Query's offlineFirst retries this looks like flickering.

Fix:
- Only `setPendingCount(count)` when the value actually changed (`setPendingCount((p) => (p === count ? p : count))`).
- Bump the interval to 15 s; the queue is also notified via `notifyChanged()` after every enqueue/replay so polling is just a safety net.

### 6. `manifest.webmanifest` 401 in the preview iframe spams console
Console shows `Manifest fetch … failed, code 401` on every load. The preview shell strips auth from non-HTML assets. The error itself doesn't reload the page, but combined with `installGlobalErrorHandlers`'s `unhandledrejection` listener it can fire `logError → supabase.from('error_logs').insert(...)` on every mount.

Fix:
- In `src/lib/error-tracking.ts`, ignore `unhandledrejection` whose `reason?.message` is `"Failed to fetch"` for `/manifest.webmanifest`, or any reason coming from the manifest URL.
- In `index.html`, add `crossorigin="use-credentials"` to the manifest link so the preview shell stops 401'ing it. (No-op in production; fixes the dev noise.)

### 7. `StuckLoading` reload button + Suspense fallback
Not a loop cause today, but if any lazy chunk fails to load (preview restart mid-route), the fallback never resolves and after 15 s the user gets a "Reload" button — they tap it and the same broken chunk loads again. Add a retry that re-triggers `import()` instead of full reload, so we don't bounce the iframe.

Fix:
- `StuckLoading` already accepts `onRetry`. In `App.tsx` Suspense fallback, pass an `onRetry` that calls `queryClient.invalidateQueries()` and `window.dispatchEvent(new Event('chunk-retry'))` (no full reload). Keep the "Reload" button as last resort.

### 8. `Dashboard` re-runs many queries on every membership change
Each of `useIncidents`, `useTrucks`, `useCrewMembers`, `useNeedsList` likely keys on `organizationId`. After fix #3 they'll be stable, but verify each hook keys queries on `membership?.organizationId` (not `membership` itself) so they don't re-create on every render. Audit and adjust if any use the whole membership object.

### 9. Capacitor StatusBar try/catch in `src/main.tsx`
`StatusBar.setOverlaysWebView` runs only on native. The `catch` swallows errors fine, but the dynamic `import` happens on web too — the `@capacitor/status-bar` plugin's web shim throws `UnimplementedError` which becomes an `unhandledrejection`, then `error_logs.insert` runs on every page load. This is a steady stream of writes during the loop.

Fix:
- Guard the entire `(async () => { ... })()` block with `if (Capacitor.isNativePlatform())` — already done — but also wrap the *plugin import* in a try/catch and never call StatusBar APIs unless `isNative` is true. Confirmed already; verify the catch covers the awaited promise. If clean, no change needed — note in commit.

## Verification
1. Reload preview → only one tutorial open per user, never re-opens on subsequent reloads.
2. Console clean of repeated `error_logs.insert` and manifest 401 noise.
3. React DevTools: `OrganizationProvider` does not re-render in a tight loop after auth settles.
4. Session replay: no more "Page loaded" every ~1.5 s — the iframe should be stable after first paint.

## Files changed
- `src/hooks/useTutorial.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useOrganization.tsx`
- `src/hooks/useImpersonation.tsx`
- `src/hooks/useNetworkStatus.ts`
- `src/lib/error-tracking.ts`
- `src/components/StuckLoading.tsx` (optional `onRetry` wiring)
- `src/App.tsx` (Suspense fallback `onRetry`)
- `index.html` (manifest `crossorigin`)
- audit pass on `src/hooks/useIncidents.ts`, `useFleet.ts`, `useCrewMembers.ts`, `useNeedsList.ts` for stable query keys

No database or auth-config changes.