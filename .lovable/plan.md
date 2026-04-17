

# Roles, Truck Access, and Multi-Tenant Seats

Yes — this makes sense and fits cleanly on top of what's already built. The multi-tenant foundation (organizations, members, invites) is in place. We're adding **a proper role model**, **per-crew truck access**, and **seat limits**. Billing tiers come later — we just need the seat plumbing now.

## What changes

### 1. Roles — simplify to two
Today `organization_members.role` is free text (`owner`, `admin`, `member`, etc.). Lock it to:
- **`admin`** — full access to everything in the org (owners are admins).
- **`crew`** — restricted to trucks they've been granted access to.

Migrate any existing `owner`/`member` rows to `admin`/`crew`.

### 2. Per-crew truck access
New table **`crew_truck_access`**:
- `id, organization_id, user_id, truck_id, granted_by, granted_at`
- Unique on `(user_id, truck_id)`

Helper function `user_can_access_truck(_user_id, _truck_id)`:
- Returns true if user is `admin` in that truck's org, OR has a row in `crew_truck_access`.

Then update RLS on truck-scoped tables (`trucks`, `incident_trucks`, `incident_truck_crew`, `shifts`, `shift_crew`, `shift_tickets`, `truck_inspections`, `truck_documents`, `truck_photos`, `truck_service_logs`, `truck_checklist_items`) so that:
- **Admins** see everything in their org (current behavior).
- **Crew** see only rows tied to trucks they have access to.

Incidents themselves stay org-visible (so crew can see the incident exists), but on the incident page they only see their assigned trucks.

### 3. Resource-order upload → create incident (both roles)
Both admins and crew can upload a resource order. The truck picker in that flow only shows:
- All org trucks for admins.
- Only accessible trucks for crew.

No new screens — we filter the existing `useAvailableTrucks()` hook.

### 4. Seats (multi-tenant readiness)
Add to `organizations`:
- `seat_limit` integer, default 5
- `tier` text, default `'free'` (placeholder for future billing)

Behavior:
- When an admin sends an invite, count `organization_members` + pending `organization_invites` for that org. If `>= seat_limit`, block with a clear message: "Seat limit reached (5/5). Upgrade your plan to add more crew."
- Owner/admin invite flow already exists — we just gate it.

This makes the app billing-ready without wiring Stripe today. When you're ready, the tier just maps to a higher `seat_limit`.

### 5. Admin UI — Truck Access manager
On **Org Settings** → new section **"Crew Access"**:
- List org members (crew only).
- Tap a crew member → see trucks → toggle access on/off (chips).
- Mobile-friendly, big tap targets, no modal stacking.

Plus on **Fleet → Truck detail** (admin only): a "Who has access" row showing which crew can use this truck, with quick add/remove.

### 6. What stays the same
- Org setup, invite flow, login — unchanged surface.
- Incident, shift, expense, inspection logic — unchanged.
- Existing data — preserved (role values migrated, no truck access rows = admins still see all, crew see none until granted).

## Files

| File | Change |
|---|---|
| DB migration | New `crew_truck_access` table + indexes; `seat_limit`/`tier` on `organizations`; `user_can_access_truck` function; rewrite RLS on truck-scoped tables; migrate role values |
| `src/services/crew-access.ts` | New — list/grant/revoke truck access |
| `src/hooks/useCrewAccess.ts` | New — query/mutation hooks |
| `src/services/organizations.ts` (or new) | Seat-limit check before sending invite |
| `src/services/incident-trucks.ts` | `fetchAvailableTrucks` already uses RLS — verify it filters correctly for crew |
| `src/components/settings/CrewAccessManager.tsx` | New — admin-only UI in Org Settings |
| `src/components/fleet/TruckAccessSection.tsx` | New — per-truck access row on detail page (admin only) |
| `src/pages/OrgSettings.tsx` | Add "Crew Access" section + show seats used (e.g. "3 of 5 seats used") |
| `src/hooks/useOrganization.tsx` | Expose `role`, `isAdmin`, `seatLimit`, `seatsUsed` |
| `src/components/incidents/IncidentTruckList.tsx` | Hide assign-truck button for crew if no accessible trucks; show empty-state message |

## Risks / things to watch
- **RLS rewrite is the biggest change.** I'll keep the existing org-scoped policies as the admin path and add a crew-scoped OR clause — no policy gets stricter for admins.
- **Existing rows survive**: any current member becomes `admin` (safest default — preserves current behavior). You'll then demote specific people to `crew` and grant them truck access.
- **Seat enforcement is invite-time only** (not a hard block on existing members) — keeps things forgiving.

## Test after build
- Admin sees all trucks; crew sees only granted ones across Fleet, Incidents, Shifts.
- Admin grants truck to crew → crew immediately sees it on next refresh.
- Crew uploads a resource order → only their accessible trucks appear in picker.
- Try to invite a 6th member at seat_limit=5 → blocked with clear message.
- Existing data still loads unchanged for admins.

## One question before I start
Should a crew member who is **assigned via `incident_truck_crew`** to a truck automatically gain access to that truck (auto-grant), or must an admin explicitly grant access first even if they're already assigned?

