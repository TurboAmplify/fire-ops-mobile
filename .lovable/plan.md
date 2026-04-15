

# App Store Readiness — Implementation Plan

## What I'll build now (in Lovable)

### 1. Install Capacitor and configure
- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` to package.json
- Create `capacitor.config.ts` with appId `app.lovable.63e454bc32e142ee9def17eb4240739a`, appName `fire-buddy-mobile`, and dev server URL

### 2. Account Deletion (App Store requirement)
- Add "Delete Account" button with confirmation dialog in `src/pages/Settings.tsx`
- Create `supabase/functions/delete-account/index.ts` edge function that:
  - Validates the authenticated user
  - Deletes all user data across tables (cascading via org membership)
  - Deletes the auth user using service role key
- Wire the button to call the edge function, then sign out

### 3. Make Privacy/Terms publicly accessible
- Move `/privacy` and `/terms` routes outside `ProtectedRoute` in `src/App.tsx`

### 4. Update Support FAQ
- Fix the offline answer in `src/pages/Support.tsx` to reflect actual offline capability

### 5. Fix NotFound page
- Add safe-area inset classes to `src/pages/NotFound.tsx`

## What you'll need to do locally (after)
1. Export to GitHub and clone
2. `npm install`
3. `npx cap add ios` (and/or `android`)
4. `npx cap sync`
5. Open in Xcode, add your 1024x1024 app icon, configure signing
6. Build and submit

For the full native setup guide, see: https://docs.lovable.dev/tips-tricks/native-mobile-apps

## Files changed

| File | Change |
|---|---|
| `package.json` | Add Capacitor dependencies |
| `capacitor.config.ts` | New — Capacitor configuration |
| `src/App.tsx` | Move `/privacy`, `/terms` outside ProtectedRoute |
| `src/pages/Settings.tsx` | Add Delete Account with confirmation |
| `src/pages/Support.tsx` | Update offline FAQ answer |
| `src/pages/NotFound.tsx` | Add safe-area classes |
| `supabase/functions/delete-account/index.ts` | New — account deletion edge function |

## Database migration
- Create a `delete_user_data` database function that cascades deletion across all org-owned tables for the user

