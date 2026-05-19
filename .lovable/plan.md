## Problem

The "Continue with Apple" button reappeared inside the packaged app. Current detection in `src/lib/platform.ts` only hides the button on iOS user agents (`iPhone|iPad|iPod`). It does not catch:

- Android Capacitor / Despia WebView
- Any case where the iOS UA string is altered or spoofed by the wrapper

Result: the Apple button renders inside the downloaded app, where the OAuth redirect cannot return to the app and strands users on a white screen.

## Fix

Tighten `isInAppWebView()` so it returns true for any non-browser shell, then let `Login.tsx` keep using the existing `showAppleSignIn = !isInAppWebView()` gate.

### `src/lib/platform.ts`
Detect packaged-app contexts in this order:
1. `window.Capacitor?.isNativePlatform?.()` is true (covers iOS + Android builds).
2. UA contains `Despia` or `CapacitorWebView`.
3. UA matches `iPhone|iPad|iPod` (iOS Safari/WKWebView — unchanged behavior).
4. UA matches `Android` AND lacks `Chrome/` and `Firefox/` and `Safari/` tokens that real mobile browsers send (in-app Android WebViews).

Anything else (desktop Chrome/Safari/Firefox, mobile Safari, mobile Chrome on Android in a real browser) returns false → Apple button still shows.

### `src/pages/Login.tsx`
No structural change. The "Sign in with Apple is coming soon to the app — please use your email and password." fallback already renders when `showAppleSignIn` is false, so packaged-app users still see a clear message.

## Files changed
- `src/lib/platform.ts` — broaden in-app WebView detection (Capacitor + Despia + Android WebView).

## Verification
1. Open desktop browser preview → Apple button visible.
2. Open `https://app.fireopshq.com` on mobile Safari → Apple button hidden (current iOS rule).
3. Inside the packaged iOS app → Apple button hidden, fallback message shown.
4. Inside the packaged Android app → Apple button hidden, fallback message shown.
