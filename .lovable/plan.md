## Important context I didn't have before

You're using **Despia** to wrap `https://app.fireopshq.com` as a native shell. Despia loads the live web app on launch, so:

- ✅ Web changes published in Lovable **do** reach the iOS app automatically — no Despia rebuild needed for normal updates.
- ❌ The native plugin approach in the previous plan **won't work**. Despia doesn't bundle the `@capacitor-community/apple-sign-in` native module. Calling it from inside the Despia WebView throws "plugin not implemented" — same white screen, different reason.

So the previous plan was wrong for your setup, and I need to fix it. Apologies for the churn.

## Why Apple sign-in is fundamentally broken inside Despia

Apple's OAuth flow opens Apple's sign-in page in the system browser, then needs to redirect back to the app via either a registered **Universal Link** or a **custom URL scheme**. Despia's wrapper doesn't register either of those for the Lovable OAuth broker URL (`/~oauth/callback`). When Apple finishes auth, the callback URL has nowhere to land → blank page → white screen. There's no JavaScript fix for that part — it's a native-shell capability that has to be configured at build time.

Without a native rebuild that registers the universal link / scheme handler, Apple sign-in **cannot** complete inside Despia.

## The fix that actually ships through Lovable today

Hide the "Continue with Apple" button when the app is running inside the Despia in-app WebView, and show a clean explanation that points users to email + password instead. The web app at `app.fireopshq.com` (opened in real Safari/Chrome) keeps Apple sign-in working unchanged.

### How we detect "inside Despia"

iOS in-app WebViews (Despia's WKWebView) have a user agent that includes `iPhone` / `iPad` but **not** the `Safari/` token that real mobile Safari sends. That's the standard, reliable way to detect a wrapped WebView. Wrap it in a small `isInAppWebView()` helper in `src/lib/platform.ts` so we have one place to change it later.

### What changes

1. **`src/lib/platform.ts`** — new file, ~15 lines. Exports `isInAppWebView()` (UA sniff for iOS WKWebView without `Safari/`).
2. **`src/pages/Login.tsx`** —
   - If `isInAppWebView()`, hide the **Continue with Apple** button and the divider. Email + password only.
   - Add a single muted line under the form: *"Sign in with Apple is coming soon to the app — please use your email and password."*
3. **Roll back the native plugin code** that won't work in Despia:
   - Remove `src/lib/apple-sign-in.ts`
   - Restore `Login.tsx` to use the original `lovable.auth.signInWithOAuth("apple", …)` for the **web only** branch (since Apple sign-in still works fine in real browsers).
   - Uninstall `@capacitor-community/apple-sign-in` (no point keeping a plugin we can't use).

### What this means for Dustin

- He opens the app → no Apple button, just email + password → he signs in normally → no white screen. No Despia rebuild, no app update from his side. The fix lands the moment you publish.

## What it would take to actually offer Apple sign-in inside the app (future, optional)

This is the real work, only when you're ready:

1. Despia would need to register the OAuth callback URL (`https://app.fireopshq.com/~oauth/callback`) as a **Universal Link** in the iOS shell. This is a Despia dashboard setting, not code — check Despia's docs for "Universal Links" or "Associated Domains."
2. Lovable Cloud would need the `apple-app-site-association` file served from your domain (Lovable hosting handles this automatically once Despia is configured to associate with `app.fireopshq.com`).
3. Test in Despia's preview build, then push a new `.ipa` to App Store Connect.

If you want, I can write a separate doc walking through that Despia configuration step-by-step in a follow-up — but it's not required to unblock Dustin today.

## Files touched

- **New:** `src/lib/platform.ts`
- **Modified:** `src/pages/Login.tsx`
- **Deleted:** `src/lib/apple-sign-in.ts`
- **Removed dep:** `@capacitor-community/apple-sign-in`

## Verification

1. Open `app.fireopshq.com` in desktop Safari/Chrome → Apple button still shows and works.
2. Open the FireOps HQ app on iPhone (Despia build) → Apple button is gone, email/password form is the only option, hint text reads "Sign in with Apple is coming soon to the app."
3. Dustin signs in with email + password → lands on dashboard, no white screen.

## On the broader frustration

You're right that this churn is exactly the kind of thing you've been clear about avoiding. The miss on my side: I treated this like a vanilla Capacitor project (with Xcode access) instead of a Despia-wrapped one. Despia's constraints — no custom native plugins, no Xcode capability changes — are a hard limit, and I should have asked first instead of proposing a fix that requires both. The plan above only uses tools you actually have.
