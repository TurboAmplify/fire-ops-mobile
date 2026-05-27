# Finish Red Cards Wiring

Foundation (DB, storage, edge function, hooks, components) is already in place. This plan completes the user-facing wiring without changing existing behavior.

## 1. Super Admin toggle
- In `src/pages/SuperAdminOrgDetail.tsx`, add a "Red Cards" toggle in the module flags section that writes `redCards` into the org's `module_flags` (matching how other flags like `expenses` are persisted).
- Gate all Red Card UI behind `useRedCardsEnabled()` reading that flag.

## 2. Crew detail wiring (admin view)
- In the crew member detail view (`src/components/crew/CrewMemberDetail.tsx` or equivalent — confirm during build), add a "Red Card" section visible only when the flag is on:
  - If a `red_cards` row exists for that crew member: render `RedCardCard` (read-only) with an "Edit" button that opens `RedCardEditor` in a sheet/dialog.
  - If none exists: show an empty state with "Add Red Card" → opens `RedCardEditor` (form + Scan modes).
- Admin-only actions enforced via `membership.role` check (`admin` or `owner`), matching the pattern used in Expenses.

## 3. Crew member self-view
- Add route `/my-red-card` in `src/App.tsx` → new page `src/pages/MyRedCard.tsx`.
  - Resolves current user → their `crew_member` row (via profile linkage) → their `red_cards` row.
  - Renders `RedCardCard` read-only. Empty state: "Your Red Card hasn't been added yet — contact your admin."
- Add a nav entry only when flag enabled:
  - Bottom tab or profile menu link "My Red Card" (placement: profile/settings menu to avoid breaking the 5-tab rule).

## 4. Crew list affordance
- In the crew list (`src/pages/Crew.tsx` or `CrewList` component), when flag is on, show a small Red Card indicator badge next to crew members that have a card on file. Tapping the crew member still navigates to detail where the card is viewable.

## 5. Guardrails
- All new UI uses semantic tokens (no hardcoded colors).
- Touch targets ≥44px, safe-area aware.
- Camera permission requested only on tap of "Scan Card" inside `RedCardEditor` (already implemented).
- Writes blocked when offline (use existing offline guard pattern).
- Loading / empty / error states on every new view.

## 6. Tests (light)
- Smoke render test for `MyRedCard` (empty + populated).
- Smoke render test for the crew detail Red Card section gated by the flag.

## Files to add
- `src/pages/MyRedCard.tsx`

## Files to edit
- `src/pages/SuperAdminOrgDetail.tsx` — add toggle
- `src/pages/Crew.tsx` or detail component — add Red Card section + indicator
- `src/App.tsx` — add `/my-red-card` route
- Profile/menu component — add "My Red Card" link (flag-gated)

## Out of scope
- QR verification, expiration reminders, bulk import, push notifications — deferred.
