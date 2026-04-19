

## Goal
Add a `/super-admin` area gated to a new `platform_admin` role (you only) that shows orgs, users, subscriptions, usage, and errors — plus support actions with an audit trail.

## Approach

### 1. Platform admin role (new, separate from `org admin`)
- New table `platform_admins (user_id uuid pk, granted_at, notes)` — explicit allow-list. No way to self-grant.
- Helper: `is_platform_admin(uid) returns boolean` (security-definer).
- Seed your user_id via migration.
- New RLS pattern: every super-admin RPC checks `is_platform_admin(auth.uid())` first. Existing tenant RLS is untouched.

### 2. Cross-org read access via SECURITY DEFINER RPCs (not loosened RLS)
Keep tenant RLS strict. Add server-side functions that bypass RLS only after confirming platform_admin:
- `admin_list_organizations()` — orgs + tier + seat_limit + member_count + last_activity_at
- `admin_get_organization(_org_id)` — full detail: members, invites, storage usage, activity counts (incidents, expenses, shift tickets, trucks)
- `admin_list_users(search, limit, offset)` — auth.users + profiles + org memberships
- `admin_recent_signups(days)` and `admin_recent_activity(days)` for the activity feed
- `admin_storage_usage_by_org()` — sums object sizes per bucket per org

### 3. Support actions (writes, all audited)
- `admin_set_org_tier(_org_id, _tier, _seat_limit, _reason)`
- `admin_extend_invite(_invite_id)`
- `admin_soft_delete_org(_org_id, _reason)` — sets a `deleted_at`, kills future logins
- `admin_reset_user_password(_user_id)` — calls auth admin API via edge function
- Every write inserts into `platform_admin_audit (id, actor_user_id, action, target_type, target_id, payload jsonb, reason, occurred_at)` — append-only, RESTRICTIVE no-update / no-delete (same pattern as `signature_audit_log`).

### 4. UI: `/super-admin/*` (mobile-tolerant but desktop-first)
- `Overview` — top-line cards: total orgs, active orgs (7d), new signups (7d), MRR placeholder, errors (24h via Sentry link)
- `Organizations` — searchable list, click into detail page with members, usage, storage, recent activity, support actions
- `Users` — search by email/name, see org memberships, last sign-in
- `Activity feed` — last 7 days of signups, org creations, invites accepted
- `Errors` — embed Sentry issue list (or link out) + recent edge function failures from `function_edge_logs`
- `Audit` — your own action log

Routes guarded by a new `<PlatformAdminGate>` (mirrors `AdminGate`).

### 5. Error monitoring (separate from super admin)
- Add **Sentry** to the React app + Capacitor + edge functions. Sentry gives crash reports, breadcrumbs, release tracking, and source maps — none of which Supabase logs do.
- In the super admin Errors tab, link out to Sentry rather than rebuilding it.

### 6. What stays in Supabase dashboard
- Raw SQL when you need to fix one row
- Auth provider config, secrets, storage bucket browsing
- Postgres logs for slow queries

### 7. What stays in App Store Connect / Play Console
- Install/uninstall counts, retention, store search terms
- Crash reports from native layer (also flows into Sentry)
- Reviews and ratings
- IAP revenue if/when you add subscriptions

## Build order (small, shippable steps)
1. `platform_admins` table + `is_platform_admin()` + seed your user. Add `<PlatformAdminGate>` and stub `/super-admin` page. *(safe, invisible to everyone but you)*
2. Read-only RPCs + Organizations list + detail page.
3. Activity feed + Users search.
4. `platform_admin_audit` table + first write action (`admin_set_org_tier`).
5. Wire up Sentry in React, Capacitor, and edge functions.
6. Errors tab pulling from Sentry + recent failed edge function logs.
7. Remaining support actions (extend invite, soft-delete org, reset password) — each one audited.

## Open questions for you
- Do you want **billing/subscriptions** real now (Stripe via Lovable Payments) or just a manual `tier` + `seat_limit` you bump by hand for the first paying customers?
- Sentry account — happy to wire it up, or do you want PostHog (which also gives session replay + product analytics)?
- For "impersonate an org" — useful for support but a privacy minefield. Skip for v1?

