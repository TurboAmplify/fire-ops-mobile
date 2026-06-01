## Goal

In Messages → New Message, add a fifth purpose: **Red cards**. When chosen, the sheet reveals a crew picker. On Send, generate one combined PDF of the selected crew members' red cards and send it as a single attachment to the selected finance officer, exactly like shift tickets are sent today. No existing flow is changed.

## UX (mobile-first)

Current purpose row has 4 chips (General, Shift ticket, Demob, OF-286). Adding a 5th would crowd a phone, so:

- Switch the purpose chips from a single wrap row to a 2-column grid on mobile (`grid grid-cols-2 sm:flex sm:flex-wrap`). Five chips lay out cleanly: 2/2/1.
- All chips keep ≥44px touch targets.

When `purpose === "red_cards"`:

1. A new **Red cards to attach** block appears below Purpose.
2. Two segmented tabs at top: **Assigned to this incident** (default) | **All crew with a red card**.
   - Assigned = crew rostered on any `incident_truck_crew` row for this incident who have a `red_cards` row.
   - All = every crew member in the org with a `red_cards` row.
3. Searchable, scrollable list with a checkbox per crew member showing name + position. Tap row = toggle. A small footer chip shows "N selected".
4. Subject auto-fills to `Red Cards — <Incident Name>` (still editable).
5. Send button is disabled until ≥1 crew member is selected.

## Send flow (mirrors `SendShiftTicketDialog`)

1. Build a combined PDF: one red card per page, rendered from the same data `RedCardCard` uses, via `@react-pdf/renderer` (already used elsewhere — fall back to `pdf-lib`/jsPDF if not present; we'll confirm in build mode). Layout: front side on page N, back side on page N+1, repeat per crew member. Filename: `red-cards-<incident-slug>-<yyyymmdd>.pdf`.
2. Upload to `communication-attachments` at `<orgId>/red-cards/<threadId-or-uuid>-<timestamp>.pdf`.
3. `createThread({ incidentId, contactId, financeOfficerId, purpose: "red_cards", subject })`.
4. `sendReply(thread.id, body, [path])`.
5. Toast + navigate to `/messages/<id>` — identical to shift ticket send.

## Files to touch

- `src/services/threads.ts` — add `"red_cards"` to `ThreadPurpose` union.
- `src/services/red-cards.ts` — add `listRedCardsForCrew(crewMemberIds: string[])` helper (single `in` query).
- `src/services/incident-truck-finance-contacts.ts` — already exposes assigned crew indirectly; add `listAssignedCrewWithRedCards(incidentId)` and `listOrgCrewWithRedCards(orgId)` either here or in `red-cards.ts`.
- `src/lib/pdf-red-cards.ts` (new) — `generateRedCardsPdfBlob(cards: { card, memberName }[]): Promise<{ blob, fileName }>`. Pure function so it can be unit-checked.
- `src/components/messages/NewThreadSheet.tsx` — add "Red cards" chip, switch to 2-col chip grid on mobile, conditional crew picker block, wire send path.
- No DB migration. `threads.purpose` is a free text column today (no check constraint observed), so adding a new value is a string change.

## Out of scope

- Editing existing thread purposes.
- Sending red cards from anywhere except the New Message sheet.
- Changing the shift ticket, OF-286, or demob flows.
- Per-card individual attachments (user chose one combined PDF).

## Test checklist

- New Message → pick **Red cards** → assigned crew list loads, default tab is "Assigned".
- Switch to "All crew" → org-wide list with red cards loads.
- Select 1, 3, and 0 crew → Send disabled at 0, enabled otherwise.
- Send → PDF appears in thread as a single attachment; opens and shows one front+back spread per selected crew member, in selection order.
- Other purposes (General, Shift ticket, Demob, OF-286) still send with no attachment changes.
- Mobile viewport (375px): all 5 chips visible without horizontal scroll, touch targets ≥44px.
