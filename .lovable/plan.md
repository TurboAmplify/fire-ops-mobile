# Plan #1 — Move Finance Officer to Incident Level

## Goal
Pull finance contacts off the per-truck card and surface them once per incident on the **Overview** tab. Support multiple contacts per incident (no per-truck split).

## Scope guardrails (golden rules)
- No rewrites of working OF-286, shift ticket, RO, or demob flows.
- Mobile-first (375px). ≤3 taps to add/edit a contact.
- Loading / empty / error states on the new section.
- Reuse existing `FinanceOfficerPicker` and `FinanceContactsSection` components — only swap the parent key from `incident_truck_id` to `incident_id`.
- Existing per-truck rows stay in the DB (not deleted) so historical data and any in-flight threads keep resolving; they just stop appearing in the UI.

## What changes for the user
- **Overview tab** gets a new "Finance Contacts" card under Notes / above Resource Orders.
  - Shows assigned finance officer(s) with name, email, phone, role chip (shifts / demob / both).
  - "Add finance contact" button → opens existing `FinanceOfficerPicker`.
  - Remove (X) per contact.
- **Trucks tab**: the per-truck "Finance Contacts" section is removed from each truck card. (Truck card stays — just shorter.)
- Shift ticket + demob send-to flows read from the **incident-level** contacts instead of the truck-level ones.

## Technical details

### Database
Add nullable `incident_id` to `incident_truck_finance_contacts` and make `incident_truck_id` nullable. New rows created from the Overview write `incident_id` + null `incident_truck_id`. Old per-truck rows are left in place but hidden from the new UI.

```
ALTER TABLE incident_truck_finance_contacts
  ALTER COLUMN incident_truck_id DROP NOT NULL,
  ADD COLUMN incident_id uuid;

CREATE INDEX itfc_incident_id_idx ON incident_truck_finance_contacts(incident_id);
```
RLS already gates by `organization_id` — no policy change needed.

Rename is avoided (keeps types & existing code compiling). A follow-up migration can rename the table later if desired.

### Service layer
`src/services/incident-truck-finance-contacts.ts`:
- Add `listIncidentFinanceContacts(incidentId)` — filters `incident_id = ? AND incident_truck_id IS NULL AND is_active`.
- Add `addIncidentFinanceContact({ incident_id, organization_id, ... })`.
- Keep existing per-truck functions intact (still used by demob/shift-ticket lookups for historical rows; new send flows will prefer incident-level).

### Components
- **New**: `src/components/incidents/IncidentFinanceContactsCard.tsx` — thin wrapper around the existing `FinanceContactsSection` pattern, parameterized by `incidentId` instead of `incidentTruckId`.
- **Edit**: `FinanceOfficerPicker.tsx` — accept either `incidentTruckId` or `incidentId` (one of two). Picks correct insert path.
- **Edit**: `IncidentDetail.tsx` → render `<IncidentFinanceContactsCard>` in the Overview `TabsContent` (above `IncidentResourceOrdersRollup`).
- **Edit**: `IncidentTruckList.tsx` (and any truck-card child rendering `FinanceContactsSection`) — remove that section from the per-truck card.

### Downstream reads (shift tickets, demob)
- Where current code resolves a "send-to" address by `incident_truck_id`, fall back to incident-level contacts when none exist on the truck. Keeps existing tickets working, new ones use incident contacts.
- No UI change to shift ticket / demob send dialogs in this step — just the resolver.

## Files touched (estimate)
1. `supabase/migrations/*` (1 migration — add `incident_id`, nullable `incident_truck_id`, index)
2. `src/services/incident-truck-finance-contacts.ts` — add 2 functions
3. `src/components/incidents/FinanceOfficerPicker.tsx` — accept incident-level mode
4. `src/components/incidents/IncidentFinanceContactsCard.tsx` — new
5. `src/pages/IncidentDetail.tsx` — render new card on Overview
6. `src/components/incidents/IncidentTruckList.tsx` — remove `FinanceContactsSection` from truck card
7. Shift-ticket + demob send resolver (1–2 spots) — fall back to incident-level

## What to test after build
1. Open an incident → Overview → "Finance Contacts" card appears (empty state).
2. Add a contact via picker → appears in list; reload → persists.
3. Add a second contact with a different role → both render.
4. Remove a contact → disappears immediately.
5. Trucks tab → per-truck finance section is gone; rest of truck card unchanged.
6. Existing incidents with old per-truck contacts: those contacts no longer render on the truck card, but historical shift tickets/demob threads still resolve.
7. Create a new shift ticket → "Send to" resolves to incident-level contact.

## Out of scope (next plans)
- Messaging inbox/thread UI (Plan #2)
- Demob packet UI (Plan #3)
- OF-286 review dashboard (Plan #4)
