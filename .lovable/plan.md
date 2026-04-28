# FireOps HQ — Stabilization First, Email Second

## Decisions locked in
- **Phasing**: Stabilize the existing app to App Store-bulletproof state, ship v1.0, then add Resend bidirectional email as a post-launch feature.
- **App Store risk posture**: Maximum-conservative. Assume the strictest possible reviewer.
- **Billing**: Stripe via the marketing site (not in-app). This avoids Apple's IAP requirement (Guideline 3.1.1) provided the app never links to or mentions the external payment flow — see App Store hardening below.
- **Error tracking**: Homegrown lightweight logger backed by a Supabase table + edge function. No third-party dependency, no new account, no PII.
- **Testing**: You + 1–2 helpers running a prescriptive checklist. I'll write the checklist so it's literally tap-by-tap, not "go explore."

---

## Why this order matters

You already have a lot working: 44 pages, multi-tenant RLS, audit triggers, offline read cache + write-blocking guard, mutation queue (`offline-queue.ts` + `offline-mutations.ts`), shift ticket signing, payroll, P&L. The risk isn't missing features — it's **fragility under a strict reviewer or a tired crew boss in poor signal**. Email is additive and exciting but layering it on top of fragile foundations multiplies risk.

---

## Phase 1 — Bulletproofing (the critical work)

### 1.1 Crash protection
**Highest priority.** A single render error today = white screen = guaranteed Apple rejection on Guideline 2.1.

- Top-level `<ErrorBoundary>` in `App.tsx` with branded fallback ("Something went wrong — Reload" + "Report issue" button)
- Per-route `<ErrorBoundary>` so one broken page doesn't kill the shell
- Stuck-loading detector: any query pending >15s shows retry UI instead of perpetual spinner
- 404 + offline + auth-expired states verified on every protected route
- Verify `NotFound` actually catches all unmatched routes (it does in App.tsx, just confirm during testing)

### 1.2 Lightweight error tracking
You can't fix what you can't see. Field crashes are invisible right now.

- New `error_logs` table (org_id, user_id, route, message, stack, app_version, online, occurred_at) with RLS: insert allowed for any authenticated user, select restricted to org admins + platform admins
- New `log-error` edge function (rate-limited, validates payload size, strips obvious PII)
- `ErrorBoundary` and a global `window.onerror` handler post to it
- Admin can view recent errors at `/admin/logs` (page already exists — extend it)
- Disclosed in Privacy Policy as "diagnostic logs (technical errors only, no message content or location data)"

### 1.3 Offline & flaky-network completeness
You already have Phase 2 (mutation queue) — `offline-queue.ts`, `useOfflineMutation`, `OfflineBanner`. Audit + finish it.

- Audit which mutations actually use `useOfflineMutation` vs. the legacy `assertOnlineForWrite` guard
- Migrate the high-stakes write paths to the queue: shift tickets, expenses, signatures, photos, crew assignments
- Verify 72-hour expiry messaging is friendly, not technical
- Add a "Pending sync (N)" indicator that shows what's queued, not just a count
- Photo upload: chunked retry-on-fail so a dropped upload doesn't = retake
- Test matrix: airplane mode → write → reconnect → confirm sync; airplane mode → write → kill app → relaunch → reconnect → confirm sync

### 1.4 Form bulletproofing
Forms are where users lose data and rage-quit. Audit every form:

`ShiftTicketForm`, `ExpenseForm`, `IncidentCreate`, `TruckForm`, `CrewMemberForm`, `NeedsListForm`, all onboarding steps:
- Optimistic update + rollback on failure
- "Unsaved changes" guard on navigation away (extend `UnsavedChangesDialog` pattern from shift tickets to all forms)
- `zod` validation with friendly errors, consistent across forms
- Required-field markers visible *before* tapping save
- Manual entry path always works even if AI parse fails (generalize the receipt-parse fallback)
- `inputMode` correct on every numeric input so iOS shows the right keyboard

### 1.5 Edge function hardening
Audit all 7 edge functions:
- `parse-receipt`, `parse-batch-receipts`, `parse-shift-ticket`, `parse-resource-order`, `parse-truck-photo`, `parse-agreement`, `delete-account`
- Add zod input validation everywhere
- JWT verification in code (since `verify_jwt = false`)
- Structured error responses, never bare 500s
- Timeout protection on AI calls — graceful "try manual entry" if AI times out
- Verify `delete-account` actually deletes everything end-to-end (Apple Guideline 5.1.1(v) requires functional account deletion)

### 1.6 Test coverage — regression armor
You have 44 pages and 1 example test. Every fix risks breaking something else.

- Smoke test that every route renders without crashing — this catches ~80% of regressions for tiny effort
- Unit tests for the 5 most critical hooks: `useShiftTickets`, `useExpenses`, `useIncidents`, `useIncidentTrucks`, `useCrewMembers`
- Integration tests for the 3 highest-stakes flows:
  1. Create incident → assign truck → submit shift ticket → sign
  2. Add expense (manual) → categorize → attach to incident
  3. Onboard new org from scratch (`OrgSetup` → first incident)

Goal: catch breakage before users do. Not aiming for high coverage — aiming for "the things that would embarrass us."

### 1.7 App Store hardening (maximum-conservative reviewer pass)

Walking every plausible Apple rejection:

- **2.1 Performance / completeness**: every screen renders, every button does something, no "Coming soon" visible. Hide unfinished features behind feature flags, not visible UI.
- **3.1.1 In-App Purchase**: Stripe-on-marketing-site is fine **only if** the app never links to the marketing site for payment, never mentions pricing, and never says "Upgrade" or "Subscribe." Audit `TrialStatusBanner`, `SuperAdminBillingCard`, `usePlan.ts`, `billing/*` — make sure nothing in the app reads as a sales funnel. Trial-expired UI must say something like "Your trial has ended. Contact your administrator." with no external link.
- **4.0 Design**: every screen has back navigation, no dead ends, no broken images, no placeholder text. Manual scan of all 44 pages.
- **4.2 Minimum Functionality**: the app does substantial work beyond the web view (signatures, camera, offline data entry). Capacitor wrapper is fine.
- **5.1.1 Privacy**: every data collection disclosed in privacy policy AND in-app. Account deletion functional + reachable from `Settings` (verify). Data export available (P&L exports already exist — confirm those count).
- **5.1.2 Data Use**: privacy policy URL on the marketing site matches in-app `/privacy` word-for-word.
- **5.2 Intellectual Property**: OF-286/OF-297 forms are recreated layouts, not scanned originals. No NWCG/USFS logos. Confirm `OF297FormPreview` and PDF generators.
- **5.6 Code of Conduct**: with multi-user invites, there must be a way to report/remove abusive members. Org admin can remove members today — just verify the UX is reachable.
- **Reviewer demo account**: provision a seeded demo org so the reviewer can exercise the app without onboarding from scratch. Document credentials in the App Store Connect "Notes for the reviewer" field.

### 1.8 Performance & polish
- Code-split admin + super-admin pages out of the main bundle
- Lazy-load all non-critical images
- 60fps scroll on incident lists with 50+ rows
- Cold start under 3s on a 2020-era phone
- Lighthouse mobile pass — fix anything below 80

---

## Phase 2 — Pre-submission test campaign (you + helpers)

I'll write a **prescriptive test plan** (`docs/test-plan.md`) — literally:
- "Open the app. Tap Incidents. Tap +. Type 'Test Fire'. Tap Save. Confirm the incident appears in the list."
- 50–80 atomic steps covering all 5 core modules + auth + onboarding + offline + signing
- Each step has expected result + checkbox
- Bug template at the bottom

You + 2 helpers run it on real iPhones over 5–7 days. Every "no" gets fixed. Then submit.

---

## Phase 3 — Resend bidirectional email (post-launch)

Only after v1.0 is approved. Three sub-phases:

### 3.1 Outbound — automated shift ticket email
- Connect Resend via the connector flow
- Set up `tickets.fireopshq.com` subdomain (separate from any future personal mail to isolate reputation)
- Domain warm-up via Warmup Inbox or similar for 2–3 weeks before live volume
- New `incident_contacts` table: finance name + email per incident
- Mini-onboarding step when an incident is created **and** when finance contact changes
- New `send-shift-ticket-email` edge function
- Trigger: supervisor signs OF-297 → `<SendShiftTicketSheet>` shows recipient → tap to send → PDF attached → audit logged
- New `email_send_log` table mirroring the standard pattern

### 3.2 Inbound — OF-286 ingestion (the high-value piece)
- Resend Inbound webhook → new `receive-email` edge function
- Routes incoming mail to incident via the `+incident-{id}@` reply-to address (eliminates threading guesswork)
- PDF attachments → AI parse via new `parse-of286` function (extends the `parse-agreement` pattern)
- `<OF286ApprovalBanner>` appears on the incident: "OF-286 received from jane@acme.com — Review & Approve"
- Side-by-side viewer: parsed totals vs. PDF
- **Hard rule: incident cannot be closed until admin taps Approve.** Human-in-the-loop gate as you described.
- On approve → P&L Actual Profit auto-updates (column already exists per `.lovable/plan.md`), incident moves to closed.

### 3.3 Mini-reply
- New `incident_email_replies` table
- Mini bottom sheet on incident detail for short replies to finance — never a full inbox UI

**Why this is safe with the maximum-conservative posture**: email is a contextual workflow feature (like Apple's own Mail-triggered Calendar invites), not a standalone email client. Same rationale Apple uses for invoicing apps that send PDFs.

---

## Effort & timeline

- **Phase 1**: 5–7 build sessions. Each session is small and shippable so you can preview after every one.
- **Phase 2**: 5–7 days of testing + bug fixes + Apple review (1–3 day Apple turnaround).
- **Phase 3**: 3–4 build sessions. Outbound first, ship, watch warm-up for 2 weeks, then inbound + approval gate.

---

## What I need from you to start

Just one thing: **approve this plan** and I'll start with **Phase 1.1 (Crash Protection)** as the very first build session. It's the single highest-value, lowest-risk change and unblocks everything else.

After 1.1 ships you can preview, then I'll move to 1.2, and so on. Each step is small enough that if you don't like a direction we can pivot without throwing away work.

---

## Technical detail (skip unless interested)

**New files in Phase 1**:
- `src/components/ErrorBoundary.tsx`, `src/components/RouteErrorBoundary.tsx`
- `src/lib/error-tracking.ts`
- `supabase/functions/log-error/index.ts`
- `src/test/integration/incident-flow.test.tsx`, `expense-flow.test.tsx`, `onboarding-flow.test.tsx`
- `src/test/smoke/all-routes.test.tsx`
- `docs/test-plan.md`

**Edited in Phase 1**:
- `src/App.tsx` (wrap with ErrorBoundary, route boundaries, Suspense)
- All forms (zod schemas + unsaved-changes guard via shared hook)
- All 7 edge functions (zod input validation, JWT check)
- `src/pages/Settings.tsx` (verify account deletion reachable)
- `TrialStatusBanner` and any billing UI (audit for IAP-policy compliance)

**Migration**: new `error_logs` table with RLS.

**Phase 3 file touch list**:
- New tables: `incident_contacts`, `incident_email_replies`, `email_send_log`
- New edge functions: `send-shift-ticket-email`, `receive-email`, `parse-of286`
- New components: `<SendShiftTicketSheet>`, `<OF286ApprovalBanner>`, `<ReplyMiniSheet>`, `<IncidentContactsStep>`
- DNS for `tickets.fireopshq.com` + Resend connector

Ready when you approve.