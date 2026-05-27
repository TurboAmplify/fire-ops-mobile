
# Red Card Feature

Adds Incident Qualification Cards ("Red Cards") to crew profiles. Gated by a per-org feature flag toggled from Super Admin. Admins manage cards (form or AI photo parse); crew members can view their own.

## 1. Data model (one migration)

New table `public.red_cards` (1:1 with `crew_members`):
- `id`, `organization_id`, `crew_member_id` (unique), `created_at`, `updated_at`
- Identity: `card_id`, `agency`, `primary_position`, `photo_url`
- Fitness: `work_capacity_test` (Light/Moderate/Arduous), `fitness_test_date`, `rt130_refresher_status`
- Dates: `issue_date`, `review_expiration_date`
- Signer: `signer_name`, `signer_title`
- Qualifications: `qualifications jsonb` — array of `{ qualification, code, status }` (matches IMG_2054)
- Notes: `restrictions_notes`
- Emergency: `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`
- Return-to: `return_address` (text)
- `source_document_url` (parsed image)

RLS: scoped by `organization_id` via existing org helper. Admins read/write all in org; members read their own row only (match `crew_members.user_id` → `auth.uid()`). Grants for `authenticated` + `service_role`. Standard `updated_at` trigger.

Add org feature flag: extend `organizations` with `red_cards_enabled boolean default false` (or add to existing org_settings if that's the pattern — will confirm by reading on build).

New storage bucket `red-cards` (private), policies scoped by `organization_id/crew_member_id/...` similar to `crew-photos`.

## 2. Backend — AI parsing

New edge function `parse-red-card` (verify_jwt=false, follows pattern of `parse-receipt`):
- Accepts `imageUrl` or `imageDataUrl`
- Calls Lovable AI Gateway (`google/gemini-2.5-pro` for vision + structured output)
- Returns parsed JSON matching red_cards columns + qualifications array
- Client service `src/services/red-cards.ts` + `src/services/ai-parsing.ts` `parseRedCardAI()`

## 3. Hooks & services

- `src/services/red-cards.ts` — CRUD + photo upload
- `src/hooks/useRedCards.ts` — `useRedCard(crewMemberId)`, `useUpsertRedCard`, `useDeleteRedCard`
- Feature-flag hook `useRedCardsEnabled()` reading org setting

## 4. UI

**Crew detail (admin view)** — `src/components/crew/CrewMemberForm.tsx` (or its parent):
- New `RedCardSection` rendered only when flag enabled
- "View Red Card" / "Add Red Card" button → opens `RedCardSheet`

**`src/components/crew/RedCardCard.tsx`** — visual red card mirroring IMG_2055 (semantic tokens, mobile-first, responsive, no hardcoded colors — define `--red-card-*` tokens in `index.css`). Two stacked cards: ID card (front) + Qualifications card (back). Tap to flip or stacked scroll.

**`src/components/crew/RedCardEditor.tsx`** (admin only):
- Mode toggle: Form / Scan
- Scan mode: Capacitor Camera or file input → calls `parse-red-card` → prefills form
- Form fields for all columns, qualifications repeater
- Photo upload for member portrait

**Crew member self-view**: new route `/my-red-card` (linked from More page when flag on). Reads the row matching their `crew_members.user_id`. Read-only `RedCardCard`.

**Super Admin** — `src/pages/SuperAdminOrgDetail.tsx`: new toggle row "Red Cards" calling org update (mirrors existing `PayrollAccessToggle` pattern).

## 5. Field/mobile considerations

- Touch targets ≥44px; bottom-sheet editor; safe-area aware
- Camera permission requested at scan tap, not earlier
- Loading/empty/error states on every fetch
- Works offline-tolerant for read (cached via existing react-query setup); writes blocked offline via existing `assertOnlineForWrite`

## 6. Tests

- `useRedCards.test.tsx`: scoped fetch by crew_member_id, upsert injects org_id
- Smoke route test for `/my-red-card`

## Technical notes
- New files only; existing crew flow untouched when flag is off
- Reuses `SignedImage`, `getViewableUrl`, existing org membership/role helpers
- AI parsing follows existing `parse-receipt` contract exactly for consistency

## Out of scope (can add later)
- QR "scan to verify" public verification endpoint
- Expiration reminder notifications
- Bulk import
