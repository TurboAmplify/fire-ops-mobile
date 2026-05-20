## What I found

This is not a prompting problem. The browser snapshot shows the app repeatedly leaving/entering protected loading states while it checks:

- authentication
- org membership
- org status
- platform admin access
- invite status on `/org-setup`

The strongest signal is repeated `organization_members` and `organization_invites` requests every 1–2 seconds, plus route replay bouncing through `/super-admin` loading. That points to a client-side provider/route guard loop, not the new messaging workflow itself.

## Golden rules for this fix

- Small, safe changes only.
- Do not rewrite auth or org setup.
- Preserve App Review org protection.
- Keep mobile-first loading/error states.
- Prefer fail-open-to-a-readable-screen over indefinite spinner.
- Add diagnostics so the next loop tells us exactly which guard is stuck.

## Fix plan

### 1. Break the provider dependency loop

The current provider order is:

```text
AuthProvider
  ImpersonationProvider
    OrganizationProvider
```

But `ImpersonationProvider` reads platform-admin state, and `OrganizationProvider` also depends on impersonation. This creates multiple independent admin/org checks racing during route transitions.

I will make the app resolve route access from one stable path:

- Auth resolves first.
- Platform admin check resolves once per user and does not refetch on every protected route mount.
- Org membership resolves once per user/impersonation target.
- ProtectedRoute only uses settled values and does not show the global spinner again after first resolution.

### 2. Fix `useOrgStatus` false-loading behavior

`useOrgStatus` currently reports loading from `orgLoading || isLoading`. When there is no org, the query is disabled, but this can still participate in a guard waiting state.

I will change it so:

- no membership = not loading, accessible by default until the membership guard decides where to send the user
- org status only loads when there is an actual `orgId`
- org status errors do not strand the user on a spinner

### 3. Make `/org-setup` one-shot instead of rechecking repeatedly

`OrgSetup` separately checks membership, platform admin, impersonation, and pending invites. The snapshot shows invite checks repeating even when the user already has memberships.

I will make invite lookup run only when:

- auth is resolved
- the user is signed in
- org membership is resolved
- there is no membership
- the user is not a platform admin passthrough

If membership exists, it redirects immediately and never fires invite lookup.

### 4. Add temporary guard diagnostics in development/preview

I will add lightweight console diagnostics for route-guard state transitions only in preview/dev mode, e.g.:

```text
[guard] /org-setup auth=false org=true platform=false status=false decision=redirect-home
```

This gives us proof of the next failing condition without exposing secrets or user data.

### 5. Replace indefinite guard spinners with stuck-safe loading

For protected-route and org-setup loading, I will use the existing `StuckLoading` pattern so users are never stranded on a blank spinner. If a dependency takes too long, the screen will show retry/reload instead of spinning forever.

### 6. Validate with the actual signal

After implementation I will verify:

- app no longer repeats `/org-setup`/`/super-admin` loading cycles
- membership/invite requests do not fire every second
- protected routes settle to the correct destination
- console diagnostics show one final guard decision instead of rapid oscillation

## Better prompt for this kind of bug

You did not do anything wrong. For future loading/loop bugs, the most useful prompt is:

```text
The app is looping/stuck on loading. Please debug route guards first, not the feature I was just working on. Use session replay, network requests, and console logs. Find which loading flag or redirect decision is oscillating, then make a small fix and add diagnostics so we can prove it stopped.
```

But honestly, your current message was enough. I should treat “looping/loading” as a guard-state investigation immediately.