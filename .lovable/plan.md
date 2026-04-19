

Picking up from the cancelled plan. The user's earlier questions were:
1. Where do I go as super admin? — no entry point exists yet.
2. Can I view as an org admin/crew member? — impersonation not built.
3. Does login have sign-up? — yes, already there (confirmed earlier).

Plan stays focused on (1) and (2). Skipping the Overview dashboard for now to keep this shippable; can add after.

## Plan — Super Admin entry point + read-only "View as"

### A. Entry points (so you can actually find /super-admin)
1. **`src/pages/More.tsx`** — add a "Platform" section at the top, visible only when `usePlatformAdmin().isPlatformAdmin` is true. One row: "Super Admin" → `/super-admin`, with the `Shield` icon. Sits above "Logs".
2. **`src/pages/Dashboard.tsx`** — small "Super Admin" pill/link in the header (top-right), gated by the same hook. Tap → `/super-admin`. Hidden for everyone else.

### B. Read-only "View as" mode
Goal: from `/super-admin/organizations/:orgId`, you can preview the app as if you were a member of that org, **read-only**, with a clear banner and an audit trail.

1. **DB — audit table + RPC**
   - New table `platform_admin_audit (id, actor_user_id, action, target_type, target_id, payload jsonb, reason, occurred_at)` — append-only (RESTRICTIVE no-update / no-delete, mirrors `signature_audit_log`).
   - New SECURITY DEFINER RPC `admin_log_action(_action, _target_type, _target_id, _payload, _reason)` — checks `is_platform_admin()`, inserts a row.

2. **Client — impersonation context**
   - Extend `OrganizationProvider` (`src/hooks/useOrganization.tsx`) with `viewAsOrgId`, `setViewAsOrgId`, `isImpersonating`. Persist `viewAsOrgId` in `sessionStorage` (clears on browser close).
   - When `viewAsOrgId` is set AND user is platform admin: `membership` is overridden by a fetched summary of that org (name, tier, seats), and `isAdmin` is forced to `false` (read-only — even if you're admin of your own org, in view-as mode you're not).
   - New helper `useIsImpersonating()` — convenience selector.

3. **Server-side read access while impersonating**
   - Tenant RLS still requires `get_user_org_ids(auth.uid())` to include the org. To make data visible without granting membership, add a SECURITY DEFINER RPC `admin_view_as_get_org_ids()` that returns `viewAsOrgId` only when `is_platform_admin()`. **Simpler alternative (preferred)**: extend `get_user_org_ids(_user_id)` to also return any org IDs from a new session-scoped GUC `app.view_as_org_id` — but GUCs across requests are fragile.
   - **Decision**: keep tenant RLS untouched. For v1, "View as" reads use new SECURITY DEFINER RPCs that check `is_platform_admin()` + return data for `_org_id`. Start with the highest-value views: incidents list, crew list, fleet list, expenses list. Each impersonation page calls the admin RPC instead of the normal hook when `isImpersonating` is true.
   - This avoids any RLS loosening — impersonation is a fully separate read path.

4. **Write blocking while impersonating**
   - Add a single guard in `src/integrations/supabase/client.ts`'s consumers — easier: a top-level `useImpersonationGuard()` hook used by ProtectedRoute that, when `isImpersonating === true`, wraps mutations to throw "Read-only: super admin view-as mode". Implementation: a small `assertNotImpersonating()` utility called at the top of every service mutation function (`crew.ts`, `incidents.ts`, `expenses.ts`, `fleet.ts`, `shifts.ts`, `shift-tickets.ts`). Cheap and safe.

5. **UI**
   - **Banner**: persistent red bar at the top of `AppShell` when `isImpersonating`. Shows org name, "Viewing as super admin (read-only)", and an "Exit" button that clears `viewAsOrgId`.
   - **Entry**: on `/super-admin/organizations/:orgId`, add a "View as this org" button. Sets `viewAsOrgId`, calls `admin_log_action('view_as_start', 'organization', orgId)`, navigates to `/`.
   - **Exit** clears `viewAsOrgId` and logs `view_as_stop`.

### Build order (small, shippable)
1. Entry points only (More + Dashboard link). Ship.
2. `platform_admin_audit` table + `admin_log_action` RPC + audit page stub.
3. Impersonation context + banner + Exit. Reads use existing hooks (will return empty since you're not a member — confirms guard works).
4. Add admin read RPCs for incidents/crew/fleet/expenses; route hooks to use them when `isImpersonating`.
5. Add `assertNotImpersonating()` guards across service mutation files.

### Open question
- For step 4, do you want all five core lists (incidents, crew, fleet, expenses, shift tickets) wired up at once, or start with **incidents + crew** only and grow from there? Each list needs a small admin RPC + a hook tweak — quick but not free.

