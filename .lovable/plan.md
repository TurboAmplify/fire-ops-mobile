## Goal

Replace the current org-name-only setup with a fast, multi-step onboarding that gets a contractor or VFD from signup to a usable app in under 5 minutes — with engines (trucks), hand crews, and individual crew members all created at minimal-data depth, then nudged to completion later.

Three confirmed decisions shape this plan:

- **Engines = trucks.** The `trucks` table stays. We introduce an "Engine" UI label conditionally based on operation type. No `engines` table, no migration of existing fleet code (inspections, shift tickets, P&L, permissions all keep working).
- **Hand crews are real.** New `crews` table with assignment + shift ticket + payroll plumbing.
- **Profile completion is computed.** Helper functions read existing fields. No `is_profile_complete` columns, no sync logic to maintain.

---

## Database changes

One migration:

1. **`organizations.operation_type`** — text, default `'engine'`, check constraint `('engine','hand_crew','both')`.
2. **`crews`** — new table:
   - `id uuid pk`, `organization_id uuid not null`, `name text not null`, `crew_type text default 'hand_crew'`, `is_active boolean default true`, `notes text`, `created_at timestamptz default now()`
   - RLS: same `organization_id IN get_user_org_ids(auth.uid())` pattern as `crew_members`.
3. **`crew_members.crew_id`** — nullable uuid, optional grouping into a hand crew. No FK cascade rules beyond `on delete set null`.
4. **`incident_crews`** — new join table for assigning a hand crew to an incident (parallel to `incident_trucks`):
   - `id`, `incident_id`, `crew_id`, `status` (`assigned`/`active`/`demobed`/`completed`), `assigned_at`, unique `(incident_id, crew_id)`.
   - RLS scoped through `get_org_from_incident()`.
5. **No** `is_profile_complete` columns. **No** changes to `trucks` schema.

---

## Onboarding flow (extends existing `OrgSetup.tsx`)

Today: org type → org name → done. New flow keeps that and appends three steps. The whole thing stays on `/org-setup` — one continuous wizard, no new route.

```text
1. Org type           (existing)
2. Org name           (existing)
3. Operation type     NEW — engine / hand crew / both
4. Quick resources    NEW — bulk-add engines and/or crews based on step 3
5. Crew members       NEW — optional, name only, bulk add
6. Done               NEW — "You're ready" screen with skip
```

Each new step has a clear **Skip** affordance. Only step 2 (org name) is truly required — everything after is skippable.

### Step 3 — Operation type
Three large tap targets. Stores `organizations.operation_type`. This drives whether step 4 shows the engines section, the crews section, or both.

### Step 4 — Quick resource setup
A single screen with one or two sections (depending on step 3):

- **Engines section** (shown if engine or both): label "Add your engines". One input, type-and-press-enter to add, chips below show what's been added with an X to remove. On step submit, bulk-insert into `trucks` with just `name` + `organization_id` (status defaults to `available`). All other truck fields stay null — they're filled in later.
- **Hand crews section** (shown if hand_crew or both): same UX, inserts into `crews` with `name` + `organization_id`.

No validation beyond non-empty name. Duplicate names allowed (user can sort that out later).

### Step 5 — Crew members (optional)
Same chip-input pattern. Bulk-insert into `crew_members` with `name` + `organization_id` and `role = 'crew'` as a placeholder. Skip is prominent.

### Step 6 — "You're ready"
Confirmation screen with a "Recommended next steps" preview (see below) and a primary CTA to land on the Dashboard.

---

## Post-onboarding: "Finish setup" surface

A new dismissible card on the Dashboard, shown when any of these are true:

- Any truck is missing core details (computed: missing VIN, make, model, plate, or insurance_expiry)
- Any crew member has only a name (computed: missing role or phone)
- Any crew has zero members assigned
- No agreements uploaded yet

Card shows a count and the top 1–2 next actions, each linking to the right edit screen. User can tap "Hide for now" to collapse it (persisted to localStorage, not the DB — the data drives whether it reappears).

A small `useSetupCompletion()` hook exposes counts so the same data can power a badge in More / Settings.

---

## Hand-crew integration points

Hand crews need to be more than a list — they have to plug into the work that already exists:

1. **Crew detail page** (`/crews/:id`) — list members assigned to the crew, add/remove members (just sets `crew_members.crew_id`).
2. **Incident detail** — new "Hand Crews" section parallel to "Trucks", uses `incident_crews`. Assign/release a crew.
3. **Shift tickets** — when a hand crew is assigned to an incident, the personnel picker on a shift ticket can "Add all from Crew X" which expands to that crew's members in `personnel_entries`. No schema change to `shift_tickets`.
4. **Payroll** — works automatically because payroll already aggregates from `personnel_entries` by name. No changes needed.

This is real scope. To keep onboarding shippable for Apple, we'll do these in two phases:

- **Phase A (this plan)**: schema, onboarding flow, basic Crews list page (`/crews`), crew detail with member management, "Finish setup" Dashboard card.
- **Phase B (follow-up)**: incident_crews UI, "Add all from Crew X" on shift tickets. Filed as docs/build-priority.md note, not built now.

---

## Files

**New:**
- `src/components/onboarding/OperationTypeStep.tsx`
- `src/components/onboarding/QuickResourcesStep.tsx` (engines + crews chips)
- `src/components/onboarding/QuickCrewMembersStep.tsx`
- `src/components/onboarding/ReadyStep.tsx`
- `src/components/onboarding/ChipInput.tsx` (reusable type-and-add)
- `src/components/dashboard/FinishSetupCard.tsx`
- `src/hooks/useCrews.ts`
- `src/hooks/useSetupCompletion.ts`
- `src/lib/profile-completion.ts` (`isTruckComplete`, `isCrewMemberComplete`, `isCrewComplete`)
- `src/lib/operation-type.ts` (`getResourceLabel(opType)` → "Engine" | "Crew" | "Resource")
- `src/pages/Crews.tsx`
- `src/pages/CrewDetail.tsx`
- `src/services/crews.ts`

**Edited:**
- `src/pages/OrgSetup.tsx` — multi-step state machine, Back/Next/Skip
- `src/pages/Dashboard.tsx` — render `FinishSetupCard`
- `src/App.tsx` — routes for `/crews` and `/crews/:id`
- `src/components/BottomNav.tsx` or `More.tsx` — entry point to Crews when operation_type includes hand crews
- `docs/build-priority.md` — log Phase B follow-ups

**Migration:** one file adding `operation_type`, `crews`, `incident_crews`, `crew_members.crew_id` with RLS.

---

## What this plan deliberately does not do

- No `engines` table.
- No `is_profile_complete` columns.
- No billing/seat-counting logic (deferred — there's no payment system yet).
- No incident_crews UI or "Add all from Crew" on shift tickets — schema is in place, UI is Phase B so it doesn't delay App Store submission.
- No changes to existing crew assignment flow on trucks (`incident_truck_crew`) — keeps working untouched.

---

## Test checklist

After build:
- New user lands on `/org-setup`, completes org type + name, then operation type, then bulk-adds 3 engines and skips crews — lands on Dashboard with 3 trucks visible in Fleet.
- Same flow but choosing "Hand crew based" — engines section is hidden, crews section appears, bulk-add 2 crews, skip members → /crews shows both crews.
- "Both" shows both sections in step 4.
- After onboarding, Dashboard "Finish setup" card shows the right counts and the Hide button persists across reloads.
- Crew detail page lets you assign existing crew_members to a crew.
- Existing users (already have an org) are unaffected — no migration of their data needed.
