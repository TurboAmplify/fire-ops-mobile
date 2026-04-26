# Fix the "Finish setup" onboarding alerts

## What's wrong today

The amber **Finish setup** card on the Dashboard fires alerts like *"2 engines need details"* and *"3 crew members are incomplete."* The detection logic works, but tapping an alert just navigates to `/fleet` or `/crew` — the user lands on the full list with **no indication of which items are incomplete or what's missing**, so they have to guess.

The helpers `truckMissingFields()` and `crewMemberMissingFields()` already exist in `src/lib/profile-completion.ts` and return the exact field names (e.g. `["VIN", "Plate", "Insurance expiry"]`), but nothing in the UI uses them.

## What we'll change

### 1. Expandable alert rows on the dashboard card
Tapping a row in the **Finish setup** card will expand it inline to show the specific items that need attention — not navigate away immediately.

Each expanded row lists the actual trucks/crew members with their missing fields:

```text
Finish setup
────────────────────────────────────────
[truck]  2 engines need details              [v]
   └─ DL31  — Missing: VIN, Plate, Insurance expiry  [Fix >]
   └─ DL61  — Missing: Insurance expiry              [Fix >]

[users]  3 crew members are incomplete       [v]
   └─ Dustin Aldrich  — Missing: Role, Phone   [Fix >]
   └─ Les Madsen      — Missing: Phone         [Fix >]
   └─ Brandon Aldrich — Missing: Role          [Fix >]

[users]  1 hand crew has no members           [v]
   └─ Engine Crew A — Add members              [Fix >]
```

"Fix >" deep-links to the right place:
- Truck → `/fleet/:truckId/edit` (already exists)
- Crew member → `/crew?edit=:memberId` (Crew page opens the edit form via query param)
- Empty crew → `/crews` (no per-crew detail page exists yet)

### 2. "Incomplete" badges on the list pages
On `/fleet` and `/crew`, each list row that's flagged as incomplete will show a small amber **Incomplete** chip next to the status badge. This way, even if a user lands on the list directly (e.g. via the bottom nav or an old bookmark), they can immediately see which items still need work.

### 3. Auto-open the edit form on `/crew` from a query param
Crew uses an inline `<CrewMemberForm>` (no detail route), so we'll have the page read `?edit=<memberId>` on mount and open the form for that member. This lets the dashboard alert deep-link directly into editing a specific crew member.

### 4. Smarter copy on the card
Update the labels to be clearer about *what* is missing, e.g.:
- "2 engines missing VIN or insurance details"
- "3 crew members missing role or phone"
- "1 hand crew has no members assigned"

## Files we'll touch

- `src/components/dashboard/FinishSetupCard.tsx` — make rows expandable, list specific items + missing fields, deep-link "Fix" buttons, refine copy.
- `src/pages/Fleet.tsx` — show **Incomplete** chip on rows where `!isTruckComplete(truck)`.
- `src/pages/Crew.tsx` — show **Incomplete** chip on rows where `!isCrewMemberComplete(member)`; read `?edit=` query param and open the inline edit form.
- `src/lib/profile-completion.ts` — already has everything we need; no changes.
- `src/hooks/useSetupCompletion.ts` — extend to also return the actual lists (`incompleteTruckList`, `incompleteMemberList`, `emptyCrewList`) so the card can render line items, not just counts.

## What stays the same
- Dismiss-for-7-days behavior.
- Auto-hide when everything is complete.
- The completion rules themselves (truck needs VIN/make/model/plate/insurance expiry; crew member needs a real role + phone; hand crew needs ≥1 member).
- Settings, navigation structure, and all unrelated dashboard sections.

## What to test after the change
1. From the Dashboard, tap the **trucks** alert — row expands and lists each incomplete truck with the exact missing fields.
2. Tap **Fix** on a truck → lands on the truck's edit page with the missing fields visible.
3. Tap the **crew members** alert → expands to show Dustin/Les/Brandon (or whoever is incomplete) with their missing fields.
4. Tap **Fix** on a crew member → `/crew` opens with that member's edit form already open.
5. Visit `/fleet` directly → incomplete trucks show an amber **Incomplete** chip.
6. Visit `/crew` directly → incomplete members show an amber **Incomplete** chip.
7. Fill in the missing fields → the alert count decreases, and when everything is complete the card disappears entirely.
