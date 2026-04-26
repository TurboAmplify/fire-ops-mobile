# App Store Readiness — Execution Plan

`app.fireopshq.com` is live and connected. **Wave 1, 2, and 3 are complete.** Only Wave 4 (packaging assets) and your final actions remain.

## Status

- ✅ **Wave 1 — Hard blockers**: Branding scrub, Sign in with Apple, account deletion, HIBP password protection
- ✅ **Wave 2 — Feature sweep**: Every module has loading/empty/error states; build clean; one debug `console.log` removed; no TODOs/FIXMEs/dead UI found
- ✅ **Wave 3 — Security**: Linter clean, security scan **0 findings** (added missing `incident-documents` UPDATE storage policy; tightened `orgmem_insert` to block invite-replay + duplicate memberships; added unique constraint on `(organization_id, user_id)`)
- ✅ **Wave 4 — Packaging assets**: package.json bumped to 1.0.0; all 17 iOS icons + 1024 marketing icon present; 8 screenshots at 1290×2796 ready; `docs/pre-submit-checklist.md` generated with paste-ready App Store Connect metadata

---

## Wave 1 — Hard blockers (Apple auto-rejects)

**1.1 Domain & branding scrub**
Three files still reference the old `lovable.app` URLs:
- `despia.json` — change `url` to `https://app.fireopshq.com` and `appId` to `com.fireopshq.app`
- `docs/despia-setup.md` — update Privacy / Support / Marketing URLs to `https://fireopshq.com/...`
- `docs/app-privacy-questionnaire.md` — same URL updates

I'll also scan `index.html`, `README.md`, `public/manifest.webmanifest`, and `capacitor.config.ts` for any straggling references and update them.

**1.2 Legal/support links inside the app**
- `src/pages/Privacy.tsx`, `src/pages/Support.tsx`, `src/pages/Terms.tsx`: confirm they either render the canonical content in-app OR redirect to `fireopshq.com/{privacy,support,terms}`. Apple requires these to be reachable both inside the binary and from the App Store listing URLs. I'll keep them in-app (safer) and make sure the marketing-site URLs match.

**1.3 Sign in with Apple**
- Use the **Lovable Cloud managed Apple provider** (zero Apple Developer config for v1 — fastest path to first approval).
- Add a "Continue with Apple" button to `src/pages/Login.tsx` for both login and signup modes, alongside the existing email form.
- Wire it through `lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })`.
- Verify the OAuth callback works on `app.fireopshq.com` (custom domains are supported by the OAuth broker).

**1.4 Account deletion path** (Apple Guideline 5.1.1(v))
- Already implemented (`Settings.tsx` → `delete-account` edge function → `delete_user_data` RPC). I'll do an end-to-end smoke test and confirm the button is clearly labeled "Delete Account" and reachable in two taps from the home screen.

**1.5 Password security**
- Enable HIBP leaked-password check via Cloud auth settings.

---

## Wave 2 — Feature completeness sweep

A pass through every module checking: loading state, empty state, error toast, role-gated actions hidden for non-admins, no dead buttons, no stray `console.log`. I'll fix issues as I find them.

Modules in scope:
- **Auth**: signup, login, password reset, Sign in with Apple, account deletion, invite-code flow
- **Incidents**: create, edit, close, OF-286 upload, missing-doc banner, agreement parsing
- **Shift Tickets (OF-297)**: create, equipment/personnel entries, signatures, draft → submit, audit trail
- **Payroll**: hours, adjustments, exports, audit trail, withholding profiles
- **Expenses**: receipt upload, categorize, fuel-type modal, approve/reject, admin-only review fields
- **Crew & Trucks**: CRUD, role assignments, truck access scoping
- **Inspections**: templates, results, photo uploads
- **Reports / P&L**: AR (invoices outstanding), AP (expenses), payroll summary, CSV/PDF exports
- **Platform admin**: cross-org guards, audit log writes, impersonation banner
- **Tutorial / Setup checklist**: completes cleanly for a brand-new user

---

## Wave 3 — Security & policy

- Run the Supabase linter and resolve any findings.
- Run the security scanner and review every RLS policy, with extra attention to the newest tables (`incident_documents`, `payroll_adjustments`, `shift_ticket_audit`, `signature_audit_log`).
- Confirm all 9 storage buckets are private and have org-scoped RLS (`receipts`, `resource-orders`, `agreements`, `truck-photos`, `truck-documents`, `crew-photos`, `signatures`, `inspection-photos`, `incident-documents`).
- Strip debug `console.log` statements from production paths.
- Confirm no API keys or secrets are exposed in the client bundle.
- Verify session handling uses the `onAuthStateChange` listener set up before `getSession()` (already correct in `useAuth.tsx`).

---

## Wave 4 — Packaging & submission assets

- Confirm app version is `1.0.0` in `despia.json` and `package.json`.
- Verify splash background `#0A0A0A`, status-bar color, and safe-area insets render correctly on iOS notch / Dynamic Island.
- Verify all required iOS icon sizes plus the 1024×1024 App Store marketing icon exist in `public/icons/`.
- Confirm screenshots exist for required iPhone sizes (6.7", 6.5", 5.5"); list which app screens to capture if any are missing.
- Generate a final `docs/pre-submit-checklist.md` you can follow step by step:
  - Exact App Store Connect metadata (description, keywords, support URL `https://fireopshq.com/support`, privacy URL `https://fireopshq.com/privacy`, age rating answers, data-collection disclosure)
  - Despia build settings (already aligned via `despia.json`)
  - Order of operations: Despia build → TestFlight → App Store Connect submit

---

## Deliverables

1. Clean codebase: zero `lovable.app` / `fire-buddy` / `fireops-hq.lovable.app` references
2. Sign in with Apple working alongside email
3. Passing security scan with all RLS verified
4. `docs/pre-submit-checklist.md` ready to follow
5. A "ready for Despia build" sign-off — you trigger the Despia build, upload the `.ipa` to App Store Connect, submit for review

---

## What you'll do after I finish

1. Verify `https://fireopshq.com/privacy`, `/support`, `/terms` are live on Netlify (Apple will click these from the App Store listing).
2. In the Despia dashboard, change the **web app URL** to `https://app.fireopshq.com` and the **bundle ID** to `com.fireopshq.app`, then trigger a fresh iOS build.
3. Upload the `.ipa` to App Store Connect via Transporter (Despia walks you through this).
4. Paste in the metadata from the pre-submit checklist I'll generate.
5. Submit for review.

Approve and I'll start Wave 1.

---

## Wave 5 — Accessibility & Native-Feel Pass (DONE)

Purpose: lower the chance of an Apple Guideline 4.2 ("web app in a wrapper") rejection and address basic accessibility expectations.

### Changes
- **Contrast (both themes)**: bumped `--muted-foreground` (light: L42% → L36%, dark: L52% → L64%) so all secondary labels clear WCAG AA 4.5:1.
- **Tap targets**: header back button, tutorial, settings, super-admin pill all bumped to 44×44pt minimum (Apple HIG).
- **VoiceOver**: added missing `aria-label` to settings button and bottom-nav items; marked decorative icons `aria-hidden="true"` to stop double-announcement; added `aria-label="Primary navigation"` to bottom nav.
- **OfflineBanner**: added `role="status"` + `aria-live="polite"` so screen readers announce connectivity changes.
- **Reduced Motion**: global `@media (prefers-reduced-motion: reduce)` cuts all transitions/animations to 0.01ms.
- **Reduced Transparency**: `@media (prefers-reduced-transparency: reduce)` swaps `glass` and `glass-tile` blur for solid surfaces in both themes.
- **Native feel**:
  - `overscroll-behavior-y: none` on body (kills rubber-band on the document)
  - `-webkit-touch-callout: none` + `user-select: none` on nav/header/buttons (form fields and prose still selectable)
  - Status bar meta switched to `black-translucent` to match the dark header
  - `orientation: "portrait"` locked in `despia.json` (iOS + Android) and `preferredContentMode: "mobile"` in Capacitor

### Verification
- `bun run build` — passes, no new warnings
- All edits scoped to presentation/CSS — no business logic changed
