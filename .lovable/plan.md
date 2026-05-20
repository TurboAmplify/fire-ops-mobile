You do not need to prompt differently. The issue is not your wording — we have been fixing downstream symptoms instead of the unstable home-route decision path.

Do I know what the issue is? Yes, enough to make the next fix targeted: the preview replay shows `/` repeatedly remounting/loading and briefly moving through `/super-admin` before returning home. The app currently makes redirect decisions from several async sources at once: auth, org membership, platform-admin status, org status, persisted React Query cache, and tutorial startup. When any of those temporarily reports stale/null data during preview reload or cache hydration, `/` can bounce through guards and look like an endless loop.

Plan:

1. Stabilize app readiness before any protected-route redirects
   - Add one route-readiness layer that waits for auth resolution and persisted query-cache hydration before rendering protected routes.
   - Prevent route guards from reading stale cached admin/org state during initial preview reload.
   - Keep the loading screen only during true readiness, not during every refetch.

2. Replace redirect ping-pong with stable route outcomes
   - Update `ProtectedRoute` so `/` does not repeatedly redirect while org/admin state is still settling.
   - Update `PlatformAdminGate` so a temporary “not admin yet” state does not immediately navigate back to `/`.
   - For platform admins, render the correct destination directly when possible instead of bouncing `/ -> /super-admin -> /`.

3. Make organization membership state deterministic
   - Ensure `OrganizationProvider` distinguishes three states: not checked yet, checked with no orgs, checked with orgs.
   - Stop treating transient fetch/null states as final “no membership” states.
   - Keep the active org choice stable across preview reloads without triggering a refetch loop.

4. Reduce home-page startup churn
   - Keep Dashboard’s core queries enabled only after a stable `organizationId` exists.
   - Avoid duplicate platform-admin checks from competing providers where possible.
   - Keep tutorial auto-start from opening until the route/org state is fully stable.

5. Add temporary loop diagnostics, then remove or silence them after verification
   - Add narrowly-scoped development-only logs for route decisions: auth state, org loading, membership status, admin loading, target redirect.
   - Use those logs to confirm there is no repeated `/`, `/super-admin`, `/org-setup`, or `/login` decision cycle.
   - Remove noisy logs after confirming the fix, or leave them behind a development-only flag.

6. Verify the actual failure mode
   - Test `/` in preview after a fresh reload.
   - Test `/super-admin` directly.
   - Test an authenticated normal org user path and the current platform-admin user path.
   - Confirm the home page reaches a stable final screen and does not remount/redirect repeatedly.

Files likely involved:
- `src/App.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/PlatformAdminGate.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useOrganization.tsx`
- `src/hooks/usePlatformAdmin.ts`
- `src/hooks/useTutorial.tsx`

Why this should fix it permanently:
- Previous changes addressed tutorial popups, manifest noise, and individual reload triggers.
- This plan addresses the actual architectural problem: multiple async guards making route decisions before the app has one stable answer.
- Once route decisions are gated and deterministic, the preview cannot bounce between home/admin/setup/login just because one async check briefly returns stale or empty data.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>