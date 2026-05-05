
## What's actually happening

Brianna Aldrich (Apple sign-in, user `3d612567…`) has:
- 0 rows in `organization_members`
- 0 rows in `organization_invites` for her email
- not in `platform_admins`
- `get_user_org_ids()` returns 0 rows for her
- `is_platform_admin()` returns false for her

So the DB cannot legitimately serve her any Dry Lightning data. The "she can see Dry Lightning Crew" symptom is almost certainly a **client-side state leak** at sign-in: either the previous user's React Query cache + the `fireops_active_org_id` localStorage key were not cleared between sessions, or a stale session in the browser flashed cached data before her queries refetched.

I'll fix both the leak (the actual exploit path) and add belt-and-suspenders DB-level guards so nothing can ever leak this way again.

---

## 1. Stop the cross-user cache leak (the real cause)

**File: `src/hooks/useAuth.tsx`** (and wherever sign-in/sign-out happen)
- On `SIGNED_IN`: if the new user.id differs from the previously cached user.id, call `queryClient.clear()` and remove `fireops_active_org_id` from localStorage **before** any org query runs.
- On `SIGNED_OUT`: same — `queryClient.clear()` + clear `fireops_active_org_id`, `fireops_tutorial_completed_at`, and any other per-user keys.
- On `USER_UPDATED` with a different id: same.

**File: `src/hooks/useOrganization.tsx`**
- Make `activeOrgId` keyed per user (e.g. `fireops_active_org_id:<userId>`) so a stale value from another user can never select an org the new user isn't in.
- After loading memberships, if `activeOrgId` isn't in the new user's memberships, drop it instead of falling back to `[0]` only — and never persist any orgId not in the loaded list.

**File: `src/lib/query-client.ts`**
- Add `userId` to the queryKey for every org-scoped query (we already key on `orgId`, but if `orgId` is stale that doesn't help). Centralize a `useScopedQueryKey(...)` helper or just include `user.id` in the keys for `org-mode`, org membership, etc.

This eliminates the only realistic path that produced what Brianna saw.

---

## 2. Lock down `organizations` SELECT (defense in depth)

Today: a user can SELECT an org they're a member of OR have an invite for OR are a platform admin for. That's correct. But `get_user_org_ids` unions in **every org** for platform admins, which is fine — Brianna isn't one. We will add one extra rule:

- New migration: tighten `organizations` SELECT policy to require **either** `EXISTS organization_members for auth.uid()`, **or** `EXISTS pending invite to get_auth_email()`, **or** `is_platform_admin(auth.uid())`. Drop the legacy "id IN get_user_org_ids" branch which double-evaluates and is harder to audit.
- Add a regression-test SQL block at the bottom of the migration: `SELECT count(*) FROM organizations WHERE …` impersonated as Brianna's id should be 0.

---

## 3. Hide platform admins from everyone except platform admins

You're the only platform admin (`14867e36…`). Today `platform_admins` already restricts SELECT to platform admins themselves, which is correct. But we'll harden the surrounding surface:

- Audit `usePlatformAdmin` / `PlatformAdminGate`: confirm a non-admin reading `platform_admins` returns no row. Already true via RLS — verified.
- The `More` page only renders the Super Admin entry when `isPlatformAdmin` is true. Confirmed.
- New migration: ensure `profiles_select_same_org` cannot expose your profile to a user who shares no org with you. Today that policy uses an `EXISTS` join through `organization_members`; since Brianna has no memberships, she can't see your profile. We'll add a RESTRICTIVE policy as a hard floor:
  - "A profile of a platform admin is only visible to: that user themselves, or another platform admin."
- Re-confirm `admin_list_*` RPCs all start with `IF NOT is_platform_admin(auth.uid()) THEN RAISE EXCEPTION` — they do; no change needed.

---

## 4. Verify and clean up Brianna's session

- Run a one-time data check: confirm `organization_members` / `organization_invites` / `platform_admins` truly have nothing for her id. (Already verified — 0 rows everywhere.)
- No data deletion needed. Her account stays as-is.
- After the fix is deployed, ask her to fully sign out and sign back in once so her client picks up clean state. (Optional: bump a `cacheVersion` constant in `query-client.ts` so every existing client invalidates on next load.)

---

## Technical details

ASCII of the cache-leak that produced the bug:

```text
[Browser]
  prev session (Dustin)  → localStorage: fireops_active_org_id = <DryLightning>
                            React Query cache: orgs/incidents under key ['org-mode', <DryLightning>]
  Brianna signs in       → onAuthStateChange SIGNED_IN, but:
                            - queryClient still has Dustin's cached data
                            - localStorage active_org_id still points at DryLightning
                            - useOrganization picks active_org_id from LS first,
                              then verifies against memberships AFTER first paint
  Result: Brianna sees DryLightning briefly until refetch resolves to {}
```

After the fix:

```text
SIGNED_IN with new user.id
  → queryClient.clear()
  → drop active_org_id (it's namespaced per user.id now)
  → useOrganization runs with userId in queryKey, returns []
  → no org selected → router sends to /org-setup
```

---

## Files I expect to touch
- `src/hooks/useAuth.tsx` — clear caches on auth changes
- `src/hooks/useOrganization.tsx` — namespace active_org_id, validate before use
- `src/lib/query-client.ts` — add user-scoped helper / cacheVersion
- `supabase/migrations/<new>.sql` — tighten `organizations` SELECT, add RESTRICTIVE policy hiding platform-admin profiles from non-admins
- (Verification only, no edits): `src/components/PlatformAdminGate.tsx`, `src/pages/More.tsx`, `usePlatformAdmin.ts`

No data is deleted. App Review account protections (`plan_code='app_review'`) remain untouched.
