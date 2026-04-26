## Goals

You're calling out three real problems:

1. **"Incident Agreements" is mislabeled** — what's at the bottom of the Overview tab is really a **Resource Order**, and Resource Orders already exist on each truck. They shouldn't be uploaded twice.
2. **"Truck Agreements" doesn't belong on a truck** — the Master Agreement (the 100+ page Forest Service contract) is **org-wide and yearly**. It should live in Org Settings, not on each truck card.
3. **Shift ticket cards look clunky** — title is cramped, status badge is mid-row, and three icon buttons take half the card.

Below is the cleanup plan.

---

## 1. Rename + remove duplicate "Incident Agreement"

**Overview tab (`IncidentDetail.tsx`)**
- Remove the `<AgreementUpload incidentId={...} label="Incident Agreements" />` card entirely.
- Replace it with a new **"Resource Orders"** card that lists every Resource Order across all trucks on this incident (read-only roll-up — tap to view the file, tap to jump to the truck).
- This way the RO uploaded during incident creation (or on a truck) shows up here automatically, no re-upload needed.

**Truck card (`IncidentTruckList.tsx`)**
- Keep the existing per-truck `ResourceOrderSection` (that's where uploads happen — one RO per truck assignment, which matches reality).

---

## 2. Move Master Agreement to Org Settings

The Master Agreement is yearly and org-wide, so it belongs at the org level.

- **Remove** `<AgreementUpload incidentTruckId={it.id} label="Truck Agreements" />` from the truck card's "More info" panel.
- **Add** a new **"Master Agreement"** section to `OrgSettings.tsx` (admin-only) that uploads/replaces the yearly contract. Stored in the existing `agreements` table with `incident_id = null` and `incident_truck_id = null` (org-wide).
- Update `useAgreements`/`fetchAgreements` to support an `orgOnly: true` query that returns rows where both `incident_id` and `incident_truck_id` are null for the current org.
- Show the current Master Agreement (filename, uploaded date) with a "Replace" button — typical use is replacing once or twice a year.

No DB migration needed — existing `agreements` table already supports null FKs.

---

## 3. Redesign the shift ticket card

Current layout (your screenshot): icon · cramped title + status badge stacked below + date · pencil · copy · trash — three icons take ~40% of the card width.

**New layout** (mobile-first, single tap to open):

```text
┌─────────────────────────────────────────────────┐
│ [icon]  FB 17 - Type 6 - 2026-04-25   Complete  │
│         Updated Apr 25                     ⋯    │
└─────────────────────────────────────────────────┘
```

- **Whole card is tappable** → opens the ticket (replaces the pencil button).
- Title gets the full row width, so no more truncation to "FB 17 - Typ...".
- **Status badge moves to the top right** of the card.
- Date sits under the title in muted text.
- **Edit/Duplicate/Delete collapse into a single `⋯` menu** (shadcn `DropdownMenu`) on the right edge. Tapping it opens a small menu: Edit · Duplicate · Download PDF · Delete. Saves ~120px of horizontal space and feels like Uber/Lyft list rows.
- Keeps "Download All" + "New Ticket" buttons at the top of the section unchanged.

Files: `src/components/shift-tickets/ShiftTicketSection.tsx`

---

## Files changed

- `src/pages/IncidentDetail.tsx` — remove Incident Agreements card; add read-only Resource Orders roll-up.
- `src/components/incidents/IncidentTruckList.tsx` — remove Truck Agreements section from "More info."
- `src/pages/OrgSettings.tsx` — add Master Agreement upload section (admin-only).
- `src/services/agreements.ts` + `src/hooks/useAgreements.ts` — add `orgOnly` query support.
- `src/components/incidents/AgreementUpload.tsx` — small tweak to support `orgOnly` mode (or new lean component if cleaner).
- `src/components/shift-tickets/ShiftTicketSection.tsx` — new card layout: status top-right, dropdown menu for actions.
- New small helper component: `IncidentResourceOrdersRollup.tsx` — fetches all incident_trucks for the incident, then ROs per truck, and shows a flat list.

No database migration. No breaking changes to data model.

---

## What you should test after build

- Overview tab: confirm "Incident Agreements" is gone; "Resource Orders" rolls up the RO from the truck.
- Org Settings (as admin): upload a PDF as Master Agreement, verify it persists and replace works.
- Truck card → More info: confirm "Truck Agreements" is gone; Truck Details + Resource Orders remain.
- Shift ticket cards: title shows in full, status pill top-right, single ⋯ menu on right with Edit / Duplicate / Delete.
