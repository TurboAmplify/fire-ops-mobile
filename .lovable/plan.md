# Apple 3.1.1 / 1.5 compliance pass

Note first: the prompt you were given refers to "ClaimsOps HQ" and `claimsopshq.com`. This project is **FireOps HQ** at `app.fireopshq.com` (published) / `fireopshq.com`. All wording and the support URL below use FireOps HQ. Support email already in the project: **support@fireopshq.com** (used in Privacy, Terms, and the current Support page) — no new address needed.

What I verified in the code before writing this:
- Billing/trial banners (`src/lib/billing/contractor-plans.ts`, `vfd-plans.ts`, `agency-plans.ts`) already contain no pricing, no Upgrade/Subscribe wording, and no external links — CTAs point to `/support`.
- There is no Stripe, checkout, or plan-selection UI anywhere in the app. Billing status is read-only data set by the marketing site's webhooks.
- `/support` currently sits behind `ProtectedRoute`, so a signed-out visitor is bounced to `/login`. This is the real 1.5 gap.
- `AccountUnavailable` page has neutral copy but only a Sign Out button — no support path.

## Changes

### 1. Make `/support` public
- Move the `/support` route out of `ProtectedRoute` in `src/App.tsx`.
- Render it as a standalone public page (no `AppShell`, no bottom nav, no org/auth dependency) when the visitor is not signed in; signed-in users keep the in-app framing.
- Rewrite `src/pages/Support.tsx` content: "FireOps HQ Support" heading, help for login problems, inactive accounts, password reset, and general technical issues; `mailto:support@fireopshq.com` link; one-business-day response statement; links to `/privacy` and `/terms`. No pricing or purchase content.
- Also route `/support` through the lightweight public entry (`src/main.tsx` + `src/PublicFormApp.tsx`) alongside `/training-form`, so it loads fast and can never hit auth/redirect logic.

### 2. Neutral inactive-account screen
- Update `src/pages/AccountUnavailable.tsx` to the exact copy:
  "Account access unavailable — This account is not currently active. Please contact your organization administrator or FireOps HQ Support for assistance."
- Buttons: **Contact Support** (to `/support`) and **Sign Out**. Nothing else.

### 3. Suppress remaining trial/countdown messaging inside the installed app
- In `src/components/billing/TrialStatusBanner.tsx`, hide any banner whose status is a trial countdown when running in a packaged app, using the existing `isInAppWebView()` helper in `src/lib/platform.ts` (Capacitor `isNativePlatform`/`getPlatform`, Despia/wrapper UA tokens, iOS detection, Android WebView detection — not viewport width).
- Locked / read-only banners stay, but with administrator-only wording and the `/support` CTA (already the case).

### 4. Sweep and confirm
- Re-scan for pricing, trial, subscribe, upgrade, renew, billing, checkout, Stripe, plan-selection, and external sales links across routes, dialogs, settings, onboarding, and redirects, and report each hit with its disposition. Super-admin billing screens are platform-staff-only and behind `PlatformAdminGate`; they contain status fields, not purchasing — I'll confirm no purchase CTA exists there and leave the operational tooling intact.

### 5. Test then publish
- Playwright run at iPhone and iPad viewports: public `/support` while signed out (no redirect, no overflow), signed-in reviewer account normal use, inactive-org screen showing only the neutral message plus the two buttons, plus mailto/privacy/terms link checks.
- Publish to production after tests pass, and report files/routes changed, detection method, payment pathways found, support email, publish status, and the phone/iPad test results.

No changes to incidents, shift tickets, crew, fleet, expenses, payroll, factoring, messaging, or org administration.
