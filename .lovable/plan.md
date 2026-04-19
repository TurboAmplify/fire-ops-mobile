

User is currently landing on `/org-setup` but expects to see the Login page first (with hero background). The flow they want:

**Sign in** → goes to their org (or `/super-admin` if platform admin) — already works.
**Sign up (no invite)** → `/org-setup` to create their org — already works.
**Sign up (with invite code)** → bypass `/org-setup`, auto-join the inviting org.

Let me verify what exists.

Findings from existing code (already read in context):
- `Login.tsx` has login/signup/forgot — no invite code field yet.
- `organization_invites` table exists (seen in `useOrganization.tsx` — counted for seat usage).
- `ProtectedRoute` sends users with no membership to `/org-setup`. Platform admins are exempt.
- The user reports landing on `/org-setup` when they expect `/login`. That means they're authenticated but have no membership — which is correct behavior post-removal from Dry Lightning. They're the super admin. They should land on `/super-admin`, not `/org-setup`.

So there are actually **two issues**:

1. **Bug**: Super admin (just removed from Dry Lightning) is landing on `/org-setup` instead of `/super-admin`. The recent ProtectedRoute change should handle this — need to check why it isn't. Likely the `usePlatformAdmin` check or `isImpersonating` flag isn't returning what we expect on this route, OR the redirect was only added at `"/"` and `/org-setup` is its own route that doesn't run that check.

2. **Feature**: Sign-up needs an optional invite-code field. With code → join existing org, skip `/org-setup`. Without code → existing flow (`/org-setup`).

Need to inspect a few files to confirm before planning.
<lov-tool-use id="toolu_vrtx_01DnmAG4hjJwnt3w8btLfV78" name="code--view" integration-id="code" data="{\"file_path\": \"src/App.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ANBp9HQxa1eiPJNZmTgauE" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/OrgSetup.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TyHoqUqyWgNhZbEPNhSR5h" name="code--search_files" integration-id="code" data="{\"query\": \"organization_invites\", \"include_patterns\": \"*.ts,*.tsx,*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013QiWGfRwYMD1CvgZUL7L6o" name="code--view" integration-id="code" data="{\"file_path\": \"src/App.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019s8gZhyHTxxTuh634WGYKN" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/OrgSetup.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Tv7TVtSWXHvvR5onbkZNDk" name="code--search_files" integration-id="code" data="{\"query\": \"organization_invites\", \"include_patterns\": \"*.ts,*.tsx,*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01A2g79xVV9WEYZB12viX3Db" name="code--exec" integration-id="code" data="{\"command\": \"psql -c \\\"\\\\d organization_invites\\\" 2>&1 | head -40\", \"user_facing_description\": \"Checking invite table schema\"}">
</lov-tool-use>
Got it. Current setup uses **email-matched invites** (no code/token entry by user). User wants an explicit invite-code flow. Let me check `token`.

The schema already has a `token` column — perfect for code-based invites. Now I have enough to plan.

<lov-plan>

## Goal

Restructure the auth landing experience:
1. **Login page** = first thing users see (already exists, just needs to be the default).
2. **Sign up** offers a toggle: "I have an invite code" vs "Set up a new team."
3. **With invite code** → join the inviting org directly, skip OrgSetup.
4. **Without invite code** → after signup, go to OrgSetup to create a new org.
5. **Sign in** → land on their existing org (current behavior).

The current bug: you're on `/org-setup` because you have no membership and `ProtectedRoute` doesn't redirect platform admins early enough on `/org-setup` (only on `/`). So the page fires before the platform-admin guard kicks in.

## Plan

### 1. Fix platform-admin landing
`OrgSetup.tsx` doesn't check platform admin status. Add: if `isPlatformAdmin && !membership && !isImpersonating`, redirect to `/super-admin`. That fixes the immediate issue you're seeing.

### 2. Add invite-code flow

**Schema** — `organization_invites` already has a `token` (uuid) column. We'll use a shorter, human-friendly code instead. Add a migration:
- New column `invite_code text` (8-char alphanumeric, unique, generated on insert via trigger).
- Keep existing `email` + `token` columns for the email-link flow (still works).
- Add RPC `accept_invite_by_code(_code text)` (SECURITY DEFINER): validates code, checks not expired, inserts `organization_members` row for the calling user, marks invite `accepted`. Returns the org id.

**Why a code in addition to email match?** Right now invites only work if the invitee signs up with the exact email the admin entered. A code lets anyone with the code join — useful when emails don't match, or for shareable team codes.

### 3. Update Login/Signup UI (`src/pages/Login.tsx`)

Add a new mode `signup-invited`. The signup screen gets a small toggle:
- **"I have an invite code"** → shows email + password + invite code field. After signup, calls `accept_invite_by_code` and routes to `/`.
- **"I'm starting a new team"** (default) → current signup behavior, then routes to `/org-setup`.

Sign-in unchanged. Already lands on `/` which routes to their org dashboard.

### 4. Update `OrgSettings.tsx` invite UI

When admin sends an invite, surface the generated `invite_code` so they can share it (e.g., copy-to-clipboard chip on the pending invites list). Keeps the existing email field for record-keeping.

### 5. Files touched

- `supabase/migrations/<new>.sql` — add `invite_code` column + generator trigger + `accept_invite_by_code` RPC.
- `src/pages/Login.tsx` — add invite-code field + post-signup branching.
- `src/pages/OrgSetup.tsx` — early redirect for platform admins; keep existing email-match invite acceptance as a fallback.
- `src/pages/OrgSettings.tsx` — show the invite code on pending invites for easy sharing.

### 6. Open questions

1. **Code format**: 8-char uppercase alphanumeric (e.g. `K7M2X9PQ`)? Or shorter 6-char? Or a word-style code like `fox-river-42`?
2. **One code per invite or one shared org code?** Per-invite (current model, tied to a specific email/role) is more secure and lets admins revoke individual codes. A single shared org code is simpler but anyone with it can join until you rotate it. Recommend per-invite.
3. **Should the invite code path require the email to match too**, or is the code alone enough? Recommend: code alone is enough (lower friction); admin still controls who gets the code.

