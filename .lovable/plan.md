

# Org Type (Contractor / VFD / State Agency) + Payroll Lock-Down

## Updated for VFD reality
VFDs run two modes of work: **local calls** (initial attack, structure, EMS — short, no paperwork) and **assignment work** (deployed on a resource order to a federal/state incident — they bill for it, just like contractors). Both must be supported in the same VFD app — they shouldn't have to switch org types.

## Part 1 — Lock Payroll to admins

- `Payroll.tsx` — guard with `!isAdmin` → "Not authorized" view.
- `App.tsx` — admin guard on `/payroll` route.
- `NavBarCustomizer.tsx` + `More.tsx` — filter "Payroll" out for crew.

## Part 2 — Three org types

### Org type = baseline defaults, not a hard cage
`org_type` sets which modules are **on by default** and what **labels** to use. Admin can flip individual modules in Org Settings. So a VFD that takes assignments just leaves Resource Orders + Shift Tickets enabled.

| Module | Contractor | VFD (default) | VFD (assignment-capable) | State Agency |
|---|---|---|---|---|
| Resource Order upload | On | **Off** | **On** (admin enables) | On |
| OF-297 Shift Tickets | On | **Off** | **On** (admin enables) | Optional |
| Run Report (NFIRS-lite) | Off | **On** | On | Off |
| Crew Time Report (CTR) | Off | Off | Off | On |
| Payroll (hourly+H&W) | On | Off | **On if assignment work** | Off |
| Training Log | Off | On | On | On |
| Walk-Around / Inventory / Fleet / Crew / Expenses / Needs | On | On | On | On |

Key change from prior plan: VFDs get **all the contractor revenue tools available** — they're just hidden by default. One toggle in Org Settings ("Accepts assignment work / resource orders") flips Resource Orders + Shift Tickets + Payroll on together.

### Terminology per type
- Contractor: Crew, Fleet, Shift Ticket
- VFD: Members, Apparatus, Run Report (assignment work still uses "Shift Ticket" label)
- State Agency: Personnel, Apparatus, CTR

### DB changes
- `organizations.org_type` text default `'contractor'`, check in `('contractor','vfd','state_agency')`.
- `organizations.modules_enabled` jsonb default `{}` for per-module overrides.
- `organizations.accepts_assignments` boolean default false (VFD convenience flag — flips RO + ShiftTickets + Payroll on).
- New table `training_records` (id, org_id, crew_member_id, course_name, completed_at, expires_at, hours, certificate_url).
- New table `call_responses` (id, org_id, incident_id, crew_member_id, dispatched_at, on_scene_at, cleared_at) — VFD run-report attendance.
- `crew_members.qualifications` jsonb (Red Card / VFD certs).
- Update `create_organization_with_owner` to accept `_org_type` param.

### Onboarding
3-card picker in `OrgSetup.tsx`:
1. Contractor — wildland firefighting business
2. Volunteer Fire Department — local response + optional assignments
3. State / Local Agency — agency or government crew

If VFD is selected, second screen asks: "Does your department take resource-order assignments?" → flips `accepts_assignments`.

### App-mode framework
`src/lib/app-mode.ts`:
```ts
export const MODE_CONFIG = {
  contractor: { modules: { resourceOrders: true, shiftTickets: true, payroll: true, runReport: false, ctr: false, training: false, callResponses: false }, terms: {...} },
  vfd:        { modules: { resourceOrders: false, shiftTickets: false, payroll: false, runReport: true, ctr: false, training: true, callResponses: true }, terms: {...} },
  state_agency: { modules: { resourceOrders: true, shiftTickets: false, payroll: false, runReport: false, ctr: true, training: true, callResponses: false }, terms: {...} },
};
// useAppMode() merges base config + accepts_assignments overrides + modules_enabled overrides
```
`accepts_assignments=true` for a VFD merges in `{ resourceOrders: true, shiftTickets: true, payroll: true }`.

### Wiring
- `BottomNav` / `NavBarCustomizer` / `More` filter nav by `modules_enabled`.
- Disabled-module routes redirect to `/`.
- `IncidentDetail` hides ResourceOrderSection / ShiftTicketSection if disabled.
- `CrewMemberForm` shows qualifications field for VFD/state.
- Labels read from `terms`.

### What we DON'T build this cycle
- Run Report and CTR forms ship as **stub pages** ("Coming soon — basic version next cycle"). Framework + flags are live so we can ship the form next cycle without touching anything else.
- Training Log ships as **basic CRUD list** so VFD/state can use it immediately.
- Existing orgs default to `contractor` — zero behavior change.

## Files

| File | Change |
|---|---|
| DB migration | `org_type`, `modules_enabled`, `accepts_assignments`, `training_records`, `call_responses`, `crew_members.qualifications`, update `create_organization_with_owner` |
| `src/lib/app-mode.ts` | New — config + `useAppMode()` |
| `src/pages/OrgSetup.tsx` | Org-type picker + VFD assignment-question step |
| `src/pages/Payroll.tsx` + `src/App.tsx` | Admin guard |
| `src/components/BottomNav.tsx` | Filter by modules |
| `src/components/settings/NavBarCustomizer.tsx` + `src/pages/More.tsx` | Filter options |
| `src/pages/OrgSettings.tsx` | Show org type + per-module toggles + "Accepts assignment work" switch (VFD only) |
| `src/services/training.ts` + `src/hooks/useTraining.ts` + `src/pages/Training.tsx` | New — basic CRUD UI |
| `src/pages/RunReport.tsx` + `src/pages/CrewTimeReport.tsx` | Stub pages with "Coming soon" |
| `src/components/incidents/*` | Hide RO / ShiftTicket sections per modules |
| `src/components/crew/CrewMemberForm.tsx` | Qualifications field (VFD/state only) |

## Test after build
- New org → pick VFD → confirm RO/ShiftTickets/Payroll hidden by default; Run Report + Training visible.
- Toggle "Accepts assignment work" in Org Settings → RO/ShiftTickets/Payroll appear immediately.
- Pick State Agency → CTR + Training visible, Payroll hidden.
- Existing contractor org → no change at all.
- Crew user → Payroll invisible everywhere, no `/payroll` access.

