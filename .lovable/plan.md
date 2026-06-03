## Goal

Replace today's two-role system (`admin` / `crew`) with three roles: **admin**, **engine_boss**, **crew_member**. Enforce permissions in both the database (RLS + helper functions) and the UI (gating menus, buttons, routes).

## Role matrix

| Capability | crew_member | engine_boss | admin |
|---|---|---|---|
| View incidents their assigned truck is on | yes | yes (all org) | yes (all org) |
| Create / edit incidents | no | yes | yes |
| Assign crew members to incident_trucks | no | yes | yes |
| Submit shift tickets (incidents they're on) | yes | yes | yes |
| Scan / submit expenses | yes (own) | yes | yes |
| View expenses | own only | all org | all org |
| View crew roster + current assignment | yes | yes | yes |
| Add / edit / delete crew members | no | yes | yes |
| Needs list — view & add | yes | yes | yes |
| Needs list — edit/delete others' items | no | yes | yes |
| Pack checklist (own) | yes | yes | yes |
| Payroll — own paystubs | yes | yes | yes |
| Payroll — others, rates, withholding | no | no | admin only |
| Fleet trucks — view | yes (assigned) | yes | yes |
| Fleet trucks — create/edit | no | yes | yes |
| Accounts Payable, financial reports, audit logs | no | no | admin only |
| Org settings, billing, plan, modules | no | no | admin only |
| Invite members, change member roles | no | no | admin only |
| Master agreement, payroll settings | no | no | admin only |
| Super-admin surfaces | no | no | platform admin only |

## Data migration

1. Add `engine_boss` value to the membership role set (`organization_members.role` is `text` today with a CHECK; broaden it to admin / engine_boss / crew_member).
2. Rename existing `'crew'` rows to `'crew_member'`.
3. Auto-promote to `engine_boss` any member whose linked `crew_members.role` (via `profiles.crew_member_id`) is `'Engine Boss'` or `'Crew Boss'`.
4. Leave current `admin` rows alone (Dustin, Les, Briana, Brandon, demo seeds stay admin).

## Database changes

- New helper functions:
  - `is_org_engine_boss(uid, org)` — true if member role is `engine_boss` OR `admin` OR platform admin.
  - `is_org_member_any(uid, org)` — true if member of org in any role.
  - Keep `is_org_admin` semantics unchanged (admin OR platform admin).
- Update RLS policies on: `incidents`, `incident_trucks`, `incident_truck_crew`, `crew_members`, `crew_compensation`, `trucks`, `truck_*` tables, `expenses`, `needs_list_items`, `agreements`, `org_payroll_settings`, `org_role_default_rates`, `payroll_adjustments`, `organization_invites`, `organization_members`.
- Pattern:
  - Writes that mutate roster/incident/truck setup → require `is_org_engine_boss`.
  - Admin-only writes (rates, settings, invites, member role changes) → keep `is_org_admin`.
  - Crew member reads scoped via `incident_truck_crew` / `crew_truck_access` joins (already partially in place).
- Add SELECT policy on `expenses` so crew_members see only rows where `submitted_by_user_id = auth.uid()`.

## Frontend changes

- `useOrganization` exposes `role`, `isAdmin`, `isEngineBoss` (true for admin OR engine_boss), `isCrewMember`.
- New `EngineBossGate` component analogous to `AdminGate` for routes like incident create/edit, fleet create/edit, crew member create/edit, accounts-payable stays `AdminGate`.
- Gate buttons / menu items:
  - `More.tsx` and `BottomNav` hide Payroll-rates, AP, Reports, Org Settings for non-admins; hide "New Incident", "Add Truck", "Add Crew Member" for crew_member.
  - `IncidentDetail` hides edit/assign-crew controls for crew_member.
  - `CrewMemberForm`, `TruckForm`, `FleetTruckCreate` gated behind `EngineBossGate`.
  - `NeedsList` allows all roles to add; restrict edit/delete of items the user did not create to engine_boss+.
  - `Expenses` list filters to own when `isCrewMember`.
- Settings page: keep all current admin-only sections behind `AdminGate`. Engine bosses get a slimmer Settings view (profile, pack checklist, notification prefs only).

## Out of scope (this pass)

- UI in Org Settings to flip a member between engine_boss and crew_member — admins can do it from the existing member row dropdown once the role values are wired; deeper UX polish can follow.
- Renaming the legacy `'crew'` label anywhere it's hardcoded in copy — values migrate cleanly; visible labels updated where they're encountered.
- Reworking impersonation / view-as to support engine_boss preview (still works as today; impersonating member uses whatever role they have in target org).

## Rollout order

1. Migration: role values + RLS + helpers.
2. `useOrganization` exposes new flags + `EngineBossGate`.
3. Route gates in `App.tsx` for incident create/edit, fleet create/edit.
4. UI gating in `More`, `IncidentDetail`, `CrewMemberForm`, `Expenses`, `NeedsList`, `Settings`.
5. Spot-check Dry Lightning users land in correct buckets.
