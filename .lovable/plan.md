# Fix shift ticket header still hidden behind iPhone status bar

## What's happening

In your screenshot the page title "Shift Ticket" and the back arrow are sitting right under the iPhone's 5G/battery icons. That means the top padding that should push the header down past the status bar is resolving to `0px` on your device.

We already have two safety nets in the code:
- A CSS variable `--app-safe-top` that uses iOS's built-in `env(safe-area-inset-top)`.
- A fallback that sets it to `59px` when we detect an iPhone user agent.

One of two things is happening in the Despia-wrapped app on your phone:
1. The Despia/WKWebView user-agent string doesn't include the word "iPhone", so the 59px fallback never turns on, and `env(safe-area-inset-top)` is reporting `0`.
2. Your phone is still showing a cached older build that didn't have the fix.

## The fix

Make the header bullet-proof so it never depends on detecting the device correctly.

1. **Always reserve room for the status bar on small screens.** Change `--app-safe-top` so its minimum is `max(env(safe-area-inset-top), 44px)` for any viewport ≤ 480px (phones). On desktop it stays `0`. This way, even if iOS, Despia, or a future wrapper reports the wrong inset, the header still clears the notch.
2. **Broaden the user-agent fallback** to also match Despia's wrapper UA and any standalone PWA (`display-mode: standalone`). This is a belt to the suspenders above.
3. **Add a tiny version stamp in the footer** (e.g. `v2026.05.18`) so you can instantly see on your phone whether the build you're looking at actually includes the fix, without guessing about cache.

## Files I'll touch

- `src/index.css` — update the `--app-safe-top` calculation and add a media-query minimum.
- `src/main.tsx` — broaden the UA / standalone detection that adds the fallback class.
- `src/components/BottomNav.tsx` or `src/pages/More.tsx` — add a small build-version label (one line).

## What to test after I push

1. Click **Publish** in Lovable.
2. On your iPhone, fully close the Despia app (swipe up, swipe it away), then reopen it.
3. Open any Shift Ticket. The title and back arrow should sit clearly **below** the 5G/battery icons, with the fire/safe-area gap visible above them.
4. Check the version stamp at the bottom of the More tab — it should show today's date.

No business logic is touched; this is purely the header spacing.
