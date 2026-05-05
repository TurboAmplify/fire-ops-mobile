# Marketing-site signup + app lockdown — combined plan

Two projects, built in parallel. The iOS app becomes "sign-in only" (Apple-safe). The marketing site at fireopshq.com becomes the only place an organization can be created and the only place subscriptions are managed. Stripe lives entirely on the marketing side; the iOS app never sees billing.

---

## Apple posture (locked in)
- App has no Sign Up button, no marketing-site URL, no pricing copy, no billing strings anywhere.
- Failed sign-in shows: "We couldn't sign you in. If you don't have an account, please contact your team admin."
- Suspended/closed orgs: members see a generic "Account unavailable. Contact your administrator." screen. **Owners** see "There's an issue with your account — please check your email" (still no URL, no billing words).
- App Review account (`plan_code='app_review'`) is always treated as active.

---

## Project A — FireOps HQ (this app)

### A1. Login screen lockdown (`src/pages/Login.tsx`)
- Remove "No account? Sign up" link.
- Remove "I'm starting a new team instead" toggle.
- Rename `signup` mode to `join` — invite code becomes mandatory. Email + password + invite code is the only way to create an account in-app.
- Generic error copy on auth failure (no URL).
- Keep "Continue with Apple" but only as a sign-in path (existing users only — see A3).

### A2. Org status column + gate
Add to `organizations`:
- `status text not null default 'active'` — values: `active | suspended | closed | app_review_protected`
- `stripe_customer_id text` (nullable, marketing site fills in)
- `stripe_subscription_id text` (nullable)
- `provisioned_via text` — `marketing_site | invite | legacy | app_review`

App-side:
- New `useOrgStatus()` hook checks `organizations.status` for the active org.
- `ProtectedRoute` redirects non-`active` orgs to `/account-unavailable` (a new minimal screen — generic copy for members, slightly more helpful copy for owners; never mentions billing or URLs).
- `plan_code='app_review'` always passes the gate.

### A3. Database trigger: block unauthorized signups
New `BEFORE INSERT` trigger on `auth.users` (`enforce_signup_path()`):

A new user is allowed to be created **only if** one of:
1. Their email matches a `pending` row in `organization_invites` (invite-code flow), OR
2. A `provisioning_tokens` row exists for that email (marketing-site provisioning, see A4), OR
3. The inserting role is `service_role` AND a `pending` provisioning token exists, OR
4. The user is the protected App Review user.

Anything else → `RAISE EXCEPTION`. This is the real teeth: even direct API calls to Supabase Auth can't create rogue accounts.

### A4. Provisioning edge functions (called by marketing site)
All HMAC-signed with shared secret `MARKETING_SITE_HMAC_SECRET`. Reject anything without a valid signature.

| Function | Behavior |
|---|---|
| `provision-org` | Input: `{email, full_name, org_name, org_type, plan_code, stripe_customer_id, stripe_subscription_id}`. Creates a `provisioning_tokens` row, creates the auth user via service role, creates the org, makes user the admin owner, sets status `active`, emails them a "set your password" link via Supabase recovery. |
| `update-org-billing` | Input: `{stripe_customer_id, plan_code, status}`. Updates plan/status. Used for plan changes. |
| `suspend-org` | Sets `status='suspended'`. Caller is Stripe webhook → marketing site. |
| `reactivate-org` | Sets `status='active'`. |
| `close-org` | Sets `status='closed'`. Soft only — no data deletion. Matches your "no real deletes except super-admin" rule. App Review org rejected. |
| `sync-stripe-customer` | One-way: marketing site can read org status if needed. |

All actions log to `platform_admin_audit` with `actor_user_id=null, action='marketing_site:*'`.

### A5. Grandfathering (existing accounts)
On migration:
- App Review org → `status='active', plan_code='app_review'` (unchanged).
- Any org with non-null `plan_code` that isn't `*_trial` → `status='active'` (treat as paid).
- Trial / unmarked orgs → `status='active'` BUT add a one-time backfill flag `legacy_grandfathered=true`. They keep working, no disruption.
- Going forward, only the marketing site or invites create new orgs.

### A6. Cleanup
- Remove `seed-reviewer-demo` paths users can hit.
- Remove the "starting a new team" branch from `useOrganization` setup flow.
- `OrgSetup.tsx` becomes invite-code-only (no "create new org" button).

---

## Project B — FireOps HQ Marketing (sibling project)

### B1. Public pages already exist
Privacy, Terms, Support — keep. Update homepage to remove "Coming Soon".

### B2. New: `/signup` flow
Multi-step:
1. Pick plan (Stripe Checkout via Stripe Elements or hosted checkout).
2. Collect: email, full name, org name, org type (contractor/VFD/agency), operation type.
3. On Stripe `checkout.session.completed` webhook → call `provision-org` on this app.
4. Show "Check your email — we sent a link to set your password and open the FireOps HQ app."

### B3. New: `/account` portal (auth required)
Owners can:
- View current plan, seats, billing status.
- Update card / billing email (Stripe Customer Portal embed).
- Cancel → calls `close-org`. Confirms: data preserved, can be restored by support.
- Pause → not exposed (only Stripe failures trigger suspension).

### B4. Stripe webhooks → app
- `customer.subscription.deleted` → `close-org`
- `invoice.payment_failed` (after retries) → `suspend-org`
- `invoice.payment_succeeded` after a suspension → `reactivate-org`
- `customer.subscription.updated` (plan change) → `update-org-billing`

All HMAC-signed when calling this app.

### B5. Marketing-site auth
Separate Supabase project on the marketing side (or shared — your call). Owner-only login, used solely for the `/account` portal. End users never see this; they live in the iOS app.

---

## Shared secret model
- `MARKETING_SITE_HMAC_SECRET` — set in both projects' Lovable Cloud secrets.
- Marketing site signs every call to this app's edge functions with HMAC-SHA256 over `timestamp + body`. App rejects requests older than 5 minutes (replay protection).

---

## Will Apple approve?
Yes, with this posture. The pattern matches Slack/Asana/Basecamp/ServiceTitan. Key compliance points:
- No external link to purchase = no 3.1.1 violation, no entitlement needed.
- "Contact your admin" copy = no in-app sign-up funnel.
- B2B operations app = Reader/Business rule applies; subscriptions sold off-app are explicitly allowed.
- App Review test account stays untouched and pre-seeded.

If you later want a softer path for prospects who downloaded the app first, we apply for the **External Link Account Entitlement** (free, ~1 day) — that's a v2 toggle, not a launch blocker.

---

## Build order
1. **App side first (this plan, Project A items)** — locks down signup immediately so nothing slips through during marketing build.
2. **Then Project B** — I switch to FireOps HQ Marketing, build Stripe + portal + webhooks against the edge functions we just shipped.
3. **End-to-end test** — provision → email → set password → sign in to app → suspend via Stripe test failure → confirm app blocks → reactivate → confirm app restores.

---

## Files changed (Project A)

```text
src/pages/Login.tsx                          rewrite (no signup mode)
src/pages/OrgSetup.tsx                       invite-only
src/pages/AccountUnavailable.tsx             new
src/components/ProtectedRoute.tsx            add status gate
src/hooks/useOrgStatus.ts                    new
src/hooks/useOrganization.tsx                drop "new team" branch
supabase/functions/provision-org/            new
supabase/functions/update-org-billing/       new
supabase/functions/suspend-org/              new
supabase/functions/reactivate-org/           new
supabase/functions/close-org/                new
supabase/functions/_shared/hmac.ts           new
migration: add status/stripe cols, enforce_signup_path trigger,
           grandfather backfill, audit log entries
```

Approve and I'll execute Project A in this run, then switch to the Marketing project to build Project B.
