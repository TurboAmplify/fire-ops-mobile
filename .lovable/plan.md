# App Store Readiness Plan — FireOps HQ

## Confirmed decisions
- **Domain layout**: `fireopshq.com` = marketing site (Netlify), `app.fireopshq.com` = this app (Lovable)
- **Sign-in**: Email + Sign in with Apple
- **Bundle ID**: `com.fireopshq.app` (changed before first submission)
- **Leaked-password check**: enabled
- **Wrapper**: Despia → points at `app.fireopshq.com`

---

## Your prep (before I start Wave 1)

These three things need to be done by you because they happen outside the codebase. I cannot do them for you, and Wave 1 depends on them.

1. **Deploy your marketing site to Netlify** at `fireopshq.com` (and `www.fireopshq.com` redirecting to root). Make sure these three pages exist and are publicly reachable:
   - `https://fireopshq.com/privacy`
   - `https://fireopshq.com/support`
   - `https://fireopshq.com/terms`
2. **Connect `app.fireopshq.com` to this Lovable project**: Project Settings → Domains → Connect Domain → `app.fireopshq.com`. Add the DNS record Lovable gives you at your registrar. Wait until the domain shows "Active".
3. **Get your Apple Developer account ready** (paid, $99/yr) and have access to App Store Connect. You'll also need to create a Services ID + .p8 key for Sign in with Apple — I'll give you the exact steps in Wave 1.

Tell me when those are done and I'll start Wave 1.

---

## Wave 1 — Hard blockers (anything Apple rejects on)

**Domain & branding scrub**
- Replace every `fire-buddy-mobile.lovable.app`, `fireops-hq.lovable.app`, and `lovable.app` reference in `despia.json`, `index.html` meta tags, README, and all `.md` files with `app.fireopshq.com` (app) or `fireopshq.com` (marketing/legal).
- Update in-app Privacy Policy and Support links to point to the Netlify pages.
- Update bundle identifier in `despia.json` to `com.fireopshq.app`.
- Update app display name, splash, and icon references to FireOps HQ branding (no Lovable mentions).

**Sign in with Apple**
- Wire up Sign in with Apple via the Lovable Cloud auth provider (managed credentials path — fastest, no Apple Developer config needed for v1; we can switch to your own credentials later if you want your name on the Apple sheet).
- Add the Apple button to the login + signup screens alongside email.
- Verify the OAuth callback works on `app.fireopshq.com`.

**Account deletion path** (Apple Guideline 5.1.1(v))
- Verify the existing `delete_user_data` flow is reachable from Settings, clearly labeled, and works end-to-end.

**Password security**
- Enable HIBP leaked-password check via Cloud auth settings.

**OF-286 workflow smoke test**
- Verify the upload, missing-document banner, and dashboard chip all work on a real incident.

---

## Wave 2 — Feature completeness sweep

A pass through every module to confirm: loading state, empty state, error toast, role-gated actions hidden for non-admins, no dead buttons, no `console.log` leaks.

- **Auth**: signup, login, password reset, Sign in with Apple, account deletion
- **Incidents**: create, edit, close, OF-286 upload, missing-doc banner
- **Shift Tickets (OF-297)**: create, equipment/personnel entries, signatures, draft → submit
- **Payroll**: hours, adjustments, exports, audit trail
- **Expenses**: receipt upload, categorize, approve/reject, admin-only review fields
- **Crew & Trucks**: CRUD, role assignments, truck access scoping
- **Inspections**: templates, results, photo uploads
- **Reports / P&L**: AR (invoices outstanding), AP (expenses), payroll summary — all exportable to CSV/PDF for accountant handoff
- **Platform admin**: cross-org guards still work, audit log writes correctly

---

## Wave 3 — Security & policy

- Run the security linter on every table, especially `incident_documents` and `payroll_adjustments` (the newest additions).
- Confirm storage buckets (`incident-documents`, `receipts`, `signatures`, etc.) are private and RLS-scoped to org.
- Strip debug `console.log` statements from production paths.
- Verify no API keys or secrets are exposed in client bundles.
- Confirm session handling uses `onAuthStateChange` listener set up before `getSession()`.
- Re-run Supabase security advisor and resolve any findings.

---

## Wave 4 — Packaging & submission assets

- Bump app version to `1.0.0` (first submission).
- Align splash screen background, status bar color, and safe-area insets for iOS notch/Dynamic Island.
- Verify all required iOS icon sizes and the 1024×1024 App Store icon are present.
- Confirm screenshots exist for required iPhone sizes (6.7", 6.5", 5.5"). I'll list which screens make the strongest screenshots.
- Generate a final **Pre-Submit Checklist** document for you with: App Store Connect metadata to copy/paste (description, keywords, support URL, privacy URL, age rating answers, data-collection disclosure), Despia build settings, and the order of operations to submit.

---

## Sign in with Apple — what you'll need from Apple Developer

For the **managed** path (recommended for v1, zero config from you): nothing. I just enable Apple as a provider in Cloud and the buttons work. The Apple consent sheet will say "Lovable" instead of "FireOps HQ" — fine for launch, can be upgraded later.

For the **branded** path (your name on the Apple sheet — optional, can defer to v1.1):
- Services ID with "Sign In with Apple" enabled
- .p8 private key + Key ID
- Team ID
- Add `app.fireopshq.com` and the Cloud callback URL to the Services ID config

My recommendation: ship v1 with the managed path, switch to branded after the first review passes. One less thing that can go wrong on first submission.

---

## What I deliver at the end

1. A clean, scrubbed codebase with zero `lovable.app` or `fire-buddy` references
2. Working Sign in with Apple alongside email
3. A passing security scan with all RLS verified
4. A pre-submit checklist file you hand to yourself (or your accountant for the AR/AP exports)
5. A "ready for Despia build" sign-off — you trigger the build, submit through App Store Connect, and the review should pass on first attempt

Approve when you're ready, and tell me once the Netlify site + `app.fireopshq.com` DNS are live so I can start Wave 1.
