
## What is actually causing the "loop"

Two different things are colliding and the user sees one symptom:

1. **The Lovable preview shell itself reloads the iframe every ~2 seconds** (the session replay shows repeated navigations to `/?__lovable_sha=ed9ee8a3`). This is the editor shell, not the app — it does NOT happen on `app.fireopshq.com` or the downloaded app.
2. **The app code amplifies that into visible "jumping"** through several real bugs, which is what we can and should fix.

I audited everything in `App.tsx`, the auth/org providers, route guards, the tutorial system, the offline subsystem, and every dialog/sheet. The findings below are everything I found — not just the first issue.

---

## Issues to fix (all of them)

### 1. Tutorial auto-opens on every preview reload (the "jumping")
`src/hooks/useTutorial.tsx`:
- Auto-start fires from a `setTimeout(700ms)` inside `runAutoStartCheck`. On each preview-shell reload, the app remounts → `autoCheckedRef` is reset on the `user?.id` effect → the bottom sheet slides up again. That is what Brandon sees as "the app is jumping".
- The timer also has no cleanup, so if the component unmounts mid-delay it still fires.

Fix:
- Cache the "already auto-shown this session" decision in `sessionStorage` (in addition to the existing `localStorage` "completed" flag) so reloads within the same tab cannot re-open.
- Make the `setTimeout` cancelable in the effect cleanup.
- Only reset `autoCheckedRef` when the user id truly changes from one signed-in id to a different signed-in id, not on `null → user` transitions during the first auth event.

### 2. Offline banner can flash "Back online" repeatedly
`src/components/OfflineBanner.tsx` keeps a `wasOffline` latch and shows a 3-second green "Back online" bar every time `isOnline` flips back. Combined with `navigator.onLine` flickers in WebView and the now-debounced hook, this still produces a one-off flash. We're already debouncing offline → online, so the "Back online" celebration is no longer useful.

Fix:
- Drop the `wasOffline` / `showReconnected` path. Only render the amber banner while the (debounced) status is offline; render nothing otherwise.

### 3. React Query never retries when `navigator.onLine` lies
`src/lib/query-client.ts` has:
```ts
retry: (failureCount, error) => {
  if (!navigator.onLine) return false;
  return failureCount < 3;
}
```
On iOS WebView / Despia (the very environment Les and Nevaeh use), `navigator.onLine` reports `false` on a working connection. Queries then fail with no retry, the UI stays in error/loading states, and the user retries manually — adding to the "looping" feel.

Fix:
- Remove the `navigator.onLine` short-circuit. Keep `failureCount < 3`. React Query already pauses fetches when `networkMode: "offlineFirst"` and the network is truly down.

### 4. Accessibility console errors firing on every render
The console is spamming "DialogContent requires a DialogTitle" and "Missing Description" warnings. Every render of these instances dumps a stack trace, which adds to the perceived churn and slows the preview. The offenders:
- `src/components/ui/command.tsx` → `CommandDialog` wraps `DialogContent` with no title at all.
- `src/components/expenses/IncidentAttachSheet.tsx` → `SheetContent` with no title.
- `src/components/fleet/TruckInspectionRunner.tsx` → `SheetContent` with no title.
- `src/components/fleet/TruckPhotoSection.tsx` → `SheetContent` with no title.
- `src/components/ui/sidebar.tsx` → mobile sidebar `SheetContent` with no title.
- `src/components/shift-tickets/QuickAttachPaperTicketSheet.tsx` → `DrawerContent` no title.
- `src/components/shift-tickets/ShiftTicketImportSheet.tsx` → `DrawerContent` no title.
- `src/components/shift-tickets/ShiftTicketForm.tsx` → three `DrawerContent` and two `DialogContent` without titles.
- `src/components/expenses/ExpenseFilterBar.tsx` → `DrawerContent` no title.
- `src/components/shift-tickets/PersonnelEntryRow.tsx` → `DialogContent` no title.

Fix:
- Add a small `VisuallyHidden` helper using `@radix-ui/react-dialog`'s built-in `Title`/`Description` primitives via the existing `sr-only` class, then add a visually-hidden `Title` + `Description` to each offender so the warnings stop. No visual change.

### 5. `assertOnlineForWrite()` is already a no-op (verified) — keep it that way
Already fixed in the previous round. Keep the guard as a no-op so non-shift-ticket writes (like background change, training records, etc.) also won't fail on a false offline flag.

### 6. Document why the preview iframe URL still reloads
This is the Lovable editor shell, not the app. Add a one-paragraph note to `.lovable/plan.md` explaining that the only way to fully validate the loop is fixed is to test on `https://app.fireopshq.com` (or the Despia build), not the preview iframe.

### 7. Manifest 401 in the preview iframe
`/manifest.webmanifest` returns 401 because the preview is behind an auth wall. This is preview-shell behavior only and disappears on `app.fireopshq.com`. No code change needed; just call this out for the user.

---

## Files I will touch

- `src/hooks/useTutorial.tsx` — sessionStorage gate + cleanable timeout + safer ref reset.
- `src/components/OfflineBanner.tsx` — drop "Back online" flash, render only true offline state.
- `src/lib/query-client.ts` — remove `navigator.onLine` short-circuit in the retry callback.
- `src/components/ui/visually-hidden.tsx` — tiny helper (or reuse `sr-only` directly).
- The dialog/sheet/drawer files listed in #4 — add hidden `Title`/`Description`.
- `.lovable/plan.md` — update with what's done + how to verify on the published URL.

No database changes, no new dependencies, no schema changes, no auth changes.

---

## How to verify after this ships

1. Open `https://app.fireopshq.com` (NOT the preview iframe) signed in as Les. The page should load once, the tutorial should NOT auto-pop if it has been seen, and the bottom-nav / dashboard should sit still.
2. Reload the page on the published URL. The screen should not "jump".
3. Open the browser console on the published URL. There should be no `DialogContent requires a DialogTitle` warnings.
4. Toggle airplane mode briefly — the amber banner appears after ~2.5s, disappears immediately on reconnect, no green flash.
5. Create a shift ticket and save — it should save (no false "Offline" toast).
6. In the Lovable preview, the editor shell may still cycle `?__lovable_sha=...` on its own — that is a Lovable-side behavior, but the app inside the iframe should no longer redraw a sheet or banner each time.
