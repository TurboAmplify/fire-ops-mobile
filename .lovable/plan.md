## What's actually happening

Dustin downloaded **FireOps HQ from the App Store** (bundle id `com.fireopshq.app`), opened it, tapped **Continue with Apple**, completed Face ID / Apple ID, and then sees a white screen.

### Root cause

In `src/pages/Login.tsx` we call:

```ts
lovable.auth.signInWithOAuth("apple", {
  redirect_uri: window.location.origin,
});
```

That is the **web** OAuth flow — it opens Apple's sign-in page in an external browser and expects to redirect back to `redirect_uri` when done.

Inside the iOS Capacitor app, `window.location.origin` is `capacitor://localhost` (or `https://localhost` on newer Capacitor). When Apple finishes auth and tries to send the user back to `capacitor://localhost/~oauth/callback`, iOS Safari has no way to hand control back to the FireOps HQ app — the universal link / custom-scheme handler isn't registered. The user is left staring at a blank Safari page, or returns to the still-empty WebView (the "white screen").

This is the standard Capacitor + web-OAuth failure mode. It only affects the App Store build; the web app at `app.fireopshq.com` is not impacted, which matches the fact that we have **zero error_logs from Dustin's user_id** (the failure is in Apple's flow, not in our React tree).

Email/password login is unaffected — Dustin can sign in right now using his email + password as a workaround.

## Fix: native Sign in with Apple on iOS

Use the OS-native Sign in with Apple sheet on iOS, then exchange the resulting Apple identity token directly with Lovable Cloud auth. Keep the existing web flow on Android and on the web app.

### 1. Add native plugin

```
npm i @capacitor-community/apple-sign-in
```

(Android continues to use the existing web OAuth broker — Apple sign-in on Android is rare and the broker flow works there because the redirect lands back in Chrome Custom Tabs which can return to the app via Android's intent system. We can revisit if Android users ever report the same issue.)

### 2. Platform-aware sign-in helper

Create `src/lib/apple-sign-in.ts`:

- Detect platform via `Capacitor.getPlatform()` (already a transitive dep of any `@capacitor/*` package).
- On `ios`:
  1. Call `SignInWithApple.authorize({ clientId: 'com.fireopshq.app', scopes: 'email name', redirectURI: '', state: crypto.randomUUID(), nonce: <random> })`.
  2. Take the returned `identityToken` and call `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })`.
  3. On success, the existing `onAuthStateChange` listener in `useAuth` picks up the session and the app navigates to `/`.
- On `android` and `web`: fall back to the current `lovable.auth.signInWithOAuth("apple", …)` path.

### 3. Wire it into Login

In `src/pages/Login.tsx`, replace the body of `handleAppleSignIn` with a single call to the helper. Keep the existing loading state, error toast, and Apple-safe error copy.

### 4. iOS project capability

When the user next runs `npx cap sync ios`, they must:
- Open `ios/App/App.xcworkspace` in Xcode.
- Under **Signing & Capabilities**, add **Sign in with Apple**.
- Confirm the App ID in the Apple Developer portal has Sign in with Apple enabled (it must, because the App Store build is already accepting Apple sign-in attempts).

This is a one-time Xcode change, not a code change, so I'll call it out in the post-implementation summary.

### 5. Immediate workaround for Dustin

Tell him to use **email + password** on the sign-in screen for now (no app update required). Once the new build with native SIWA is shipped to TestFlight / the App Store, Continue with Apple will work.

## Files touched

- `src/pages/Login.tsx` — call new helper from `handleAppleSignIn`.
- `src/lib/apple-sign-in.ts` — new file, ~40 lines, platform branch.
- `package.json` — add `@capacitor-community/apple-sign-in`.

No DB changes. No changes to web auth flow. No changes for users on the web app.

## Out of scope (intentionally)

- Rewriting the broader Capacitor packaging or splitting iOS/Android configs further.
- Building a service worker / chunk-recovery system — that was the right fix for a *web* white screen, but Dustin's issue is a native OAuth redirect problem, not a stale bundle. We can revisit web hardening separately.
- Changing anything about the Lovable OAuth broker or web sign-in.

## How we'll verify

1. Build the dev Capacitor config on a simulator, tap **Continue with Apple**, confirm the native sheet appears (not a Safari popup) and the app lands on the dashboard.
2. Confirm web sign-in at `app.fireopshq.com` still uses the broker flow and still works for Dustin and other users.
3. Confirm email/password still works on both platforms.
