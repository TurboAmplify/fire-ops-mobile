## Problem

Tapping a crew member on `/crew` jumps straight into the editable form. Inputs are live, so on a phone it's easy to bump a field and accidentally change a name, role, or phone number. With Red Cards now showing inside that same form, the risk of accidental edits is worse — the card is a viewing surface, not an editing surface.

## Goal

Tapping a crew member should **view** them, not edit them. Editing stays available, but only when the user clearly asks for it.

## Plan

### 1. New read-only Crew Member Detail view

- Tapping a crew card opens a **Detail sheet** (same bottom-sheet container we use today), not the editor.
- The sheet shows, all read-only:
  - Avatar + name + active/inactive badge
  - Role, phone (tap-to-call), email (tap-to-email)
  - Red Card section (existing `RedCardCard`, view-only)
  - Any other existing profile fields, displayed as labeled rows — no inputs
- Header actions on the sheet:
  - **Close** (X)
  - **Edit** button (pencil icon) — admins only, opens the existing `CrewMemberForm` modal on top
- No input element is rendered in the detail view, so accidental taps can't mutate anything.

### 2. Edit flow stays intact, just gated behind the Edit button

- `CrewMemberForm` is unchanged — same fields, same Red Card admin controls (Add / Edit / Scan).
- Only entry points become: the Detail sheet's **Edit** button, the **Add** button in the Crew header, and the existing `?edit=<id>` deep link.
- Non-admin members see no Edit button; they get a view-only detail.

### 3. Red Card behavior inside Detail vs Edit

- Detail sheet: `RedCardCard` rendered read-only with a small "View full card" affordance if we want a zoom later. No Add/Edit/Scan controls visible to non-admins.
- Edit form: keeps the current `CrewMemberRedCardSection` (Add / Edit / Scan Card) for admins.

### 4. Small guardrails

- Detail sheet supports the existing `?edit=<id>` deep link by opening Detail **and** immediately opening Edit on top, so existing links still land users in the editor.
- Keep all touch targets ≥44px; safe-area aware; no hover-only affordances.
- No DB or RLS changes — this is purely a UI restructure.

## Files

**New**
- `src/components/crew/CrewMemberDetail.tsx` — read-only sheet (uses `RedCardCard`, role/phone/email rows, Edit button for admins).

**Edited**
- `src/pages/Crew.tsx` — tap opens Detail instead of Edit; Add button still opens the form directly.
- (Optional) `src/components/crew/CrewMemberRedCardSection.tsx` — no change needed; admin controls already hide for non-admins.

## Out of scope

- No changes to crew data model, RLS, or the Red Card editor itself.
- No new "view-only" mode inside `CrewMemberForm` — we keep that component focused on editing and add a separate detail component instead. Cleaner than a mode flag and matches existing patterns (e.g., truck detail vs. truck form).
