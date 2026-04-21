

# App Store Readiness — Final Plan

## Decisions locked in

1. **"Coming Soon" pages** → Option A: remove the route, page, and any nav entries entirely. (Also applies to `RunReport.tsx` — same "Coming Soon" issue.)
2. **iOS Info.plist setup** → adapted for **Despia** (no Mac/Xcode). Despia accepts a config file at the project root that injects the iOS permission strings during their build. I'll create `despia.json` with the three required strings so you don't have to touch native code.
3. **og:image** → replace the stale Lovable preview screenshot with a professionally generated FireOps HQ social card image, hosted in the project at `/og-image.png`.

## What I'll change in code

| File | Change |
|---|---|
| `src/pages/CrewTimeReport.tsx` | Delete |
| `src/pages/RunReport.tsx` | Delete (also "Coming Soon") |
| `src/App.tsx` | Remove `/ctr` and `/run-reports` routes + imports |
| `src/components/settings/NavBarCustomizer.tsx` | Remove `ctr` and `runReport` tab options |
| `src/components/ModuleGate.tsx` | Remove `ctr` and `runReport` modules |
| `src/hooks/useOrgSettings.ts` (if module flags live here) | Remove `ctr` / `runReport` defaults |
| `src/pages/Settings.tsx` | Replace hardcoded `"1.0.0"` with version from `package.json` |
| `index.html` | Replace stale og:image URL with `/og-image.png` |
| `public/og-image.png` | New — professional 1200×630 FireOps HQ social card |
| `public/_redirects` | Delete (Lovable hosting handles SPA fallback natively) |
| `despia.json` | New — at project root, contains iOS permission strings + app metadata for Despia's build pipeline |
| `docs/mobile-store-readiness.md` | Mark completed items, note Despia path |
| `docs/app-review-notes.md` | Add Sign in with Apple note + pre-submission checklist |
| `docs/app-privacy-questionnaire.md` | New — exact answers to paste into App Store Connect's privacy questionnaire |
| `docs/despia-setup.md` | New — Despia-specific build/submission walkthrough |

## How the Despia path works (replaces `npx cap` steps)

Despia takes your published web app URL and wraps it as a native iOS/Android app. The three iOS permission strings Apple requires get configured in Despia's dashboard (or via `despia.json`):

- `NSCameraUsageDescription` — for receipt/truck/inspection/signature photos
- `NSPhotoLibraryUsageDescription` — for picking existing images
- `NSPhotoLibraryAddUsageDescription` — for saving exported PDFs

I'll put the exact strings in `despia.json` and in `docs/despia-setup.md` with step-by-step instructions for the Despia dashboard, so you can copy-paste them in either place.

## What only you can do

1. In Despia: paste the three permission strings (from `despia.json` or `docs/despia-setup.md`)
2. In Despia: upload the 1024×1024 app icon from `public/icon-512.png` (or upscale)
3. Create the `appreview@fireopshq.com` demo account in your live app and seed it with the data described in `docs/app-review-notes.md`
4. In App Store Connect:
   - Privacy Policy URL: `https://fire-buddy-mobile.lovable.app/privacy`
   - Support URL: `https://fire-buddy-mobile.lovable.app/support`
   - Fill out App Privacy questionnaire using `docs/app-privacy-questionnaire.md`
   - Upload screenshots from `public/icons/store/`
   - Paste reviewer notes from `docs/app-review-notes.md`

## Rejection risk

- **Before changes:** ~70% (the two "Coming Soon" pages alone are near-certain rejection under Guideline 2.1)
- **After this plan + your steps in Despia/App Store Connect:** ~10–15% (normal first-submission baseline)

## One open item — confirm before I start

The og:image will be generated at 1200×630 with FireOps HQ branding (dark theme, fire-orange accent, app name + tagline "Wildfire Operations Management"). Want me to:

- **a)** Generate it directly now with your existing brand colors, or
- **b)** Show you 2–3 style options first to pick from?

