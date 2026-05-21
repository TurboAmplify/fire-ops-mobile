## Diagnosis

I know what the loop is now. The runtime logs show this exact conflict:

```text
[guard:protected] redirect-org-setup { path: "/super-admin" }
[guard:protected] allow-platform-admin { path: "/super-admin" }
[guard:protected] allow { path: "/super-admin" }
```

That means `/super-admin` is still being evaluated by org-based protection before the platform-admin state is fully stable. A platform admin without a normal org membership can briefly get sent to `/org-setup`, then `/org-setup` sends them back to `/super-admin`, producing the visible loading loop.

The problem is structural: `/super-admin` should not be inside the same guard that enforces normal org membership.

## Decisive fix plan

1. **Create a dedicated super-admin route guard**
   - Add a focused guard for `/super-admin/*` that checks only:
     - auth is loaded
     - user exists
     - platform-admin check is loaded
     - user is platform admin
   - It will not call `useOrganization()`.
   - It will not call `useOrgStatus()`.
   - It will not redirect to `/org-setup`.

2. **Remove org protection from all super-admin routes**
   - In `App.tsx`, change every `/super-admin` route from this pattern:

```text
ProtectedRoute -> PlatformAdminGate -> SuperAdmin page
```

   - To this pattern:

```text
SuperAdminRoute -> SuperAdmin page
```

   This removes the conflicting guard stack entirely instead of trying another small conditional patch.

3. **Keep normal app routes unchanged**
   - `ProtectedRoute` will continue protecting the field app routes: incidents, fleet, crew, expenses, messages, payroll, etc.
   - Normal users without org membership still go to `/org-setup`.
   - Suspended/closed orgs still go to `/account-unavailable`.
   - No email/Resend logic changes.
   - No database migration.

4. **Make `/org-setup` a one-way fallback only for normal users**
   - Keep its existing behavior for invite-only onboarding.
   - Platform admins should no longer reach it from `/super-admin`, because the new super-admin guard bypasses org membership entirely.

5. **Validate with the actual signal**
   - After implementation, verify the console no longer shows:

```text
redirect-org-setup { path: "/super-admin" }
```

   - Expected stable sequence:

```text
[guard:super-admin] loading
[guard:super-admin] allow
```

6. **If it still loops after this**
   - Stop patching route guards.
   - Temporarily make `/super-admin` render a minimal authenticated diagnostic page so we can confirm whether the remaining loop is caused by the page body, query cache persistence, or preview/dev-server reloads.
   - That gives us a hard isolation point instead of another guessing cycle.

## Files to change

- `src/App.tsx`
- `src/components/PlatformAdminGate.tsx` or a new `src/components/SuperAdminRoute.tsx`

## What this avoids

- No backend changes
- No auth schema changes
- No Resend/email changes
- No broad refactor
- No touching field-user workflows

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>