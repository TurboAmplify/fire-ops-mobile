# Plan — finance contacts & factoring/shift-ticket UX

I already shipped one fix this turn: **the "View PDF" tab was throwing a cross-origin navigation error in the preview iframe.** I rewrote `openPdf` in `FactoringSubmitCard.tsx` to fetch the PDF as a blob and open it via an anchor click, which works inside sandboxed previews, mobile webviews, and on Live. Schedule PDF + OF-286 view buttons should now actually open.

Here is the plan for the rest. **Nothing below is built yet** — approve and I'll execute.

---

## 1. Per-document-type toggles on finance contacts

**Today:** `incident_truck_finance_contacts.role` is a single enum (`shift_tickets | demob | both`). No way to say "Loren gets shifts + demob + red cards, Dawn gets shifts only, OF-286 only goes back to the sender."

**Change:** Replace the single `role` with 4 boolean flags on each contact row:
- `receives_shift_tickets` (default true)
- `receives_demob` (default true)
- `receives_red_cards` (default false)
- `receives_of286` (default false — OF-286 normally only echoes back to the original sender)

Migration backfills:
- `role='shift_tickets'` → shift=true, others=false
- `role='demob'` → demob=true, others=false
- `role='both'` → shift=true, demob=true, red_cards=false, of286=false

Old `role` column stays for one release as a fallback, then is dropped in a follow-up.

**UI in `FinanceContactsSection.tsx`:** Each contact row gets 4 small toggle chips (Shifts / Demob / Red Cards / OF-286). Tap to enable/disable. Replaces the current "shifts + demob" badge.

**Send-side filtering** — only show contacts whose flag matches the doc being sent:
- `SendShiftTicketDialog` → filter `receives_shift_tickets = true`
- Demob email flow → `receives_demob = true`
- Red card send → `receives_red_cards = true`
- OF-286 / factoring submission → `receives_of286 = true` (the existing factoring flow already targets `factor_contact_email` from settings, not these contacts, so this only affects internal OF-286 routing)

## 2. Dedup finance officers on an incident

**Today:** Loren Dragg appears multiple times because nothing blocks re-adding the same `finance_officer_id`.

**Change:**
- Add a partial unique index: `(incident_id, finance_officer_id) WHERE incident_truck_id IS NULL AND is_active AND finance_officer_id IS NOT NULL`
- Same for the truck-scoped variant.
- `FinanceOfficerPicker` already calls add — wrap it to detect 23505 and show "Already added — updated their toggles instead" then merge flags onto the existing row.
- One-off contacts (no `finance_officer_id`) are still allowed to duplicate by design.

Also: backfill — for the existing 2026 long-term severity incident, soft-delete the duplicate Loren rows, keep the oldest active one.

## 3. Factoring → "Send to WideQ" visibility

The Submit button + review checkbox + confirmation banner shipped in the last turn, but you're not seeing them. Two likely reasons:
1. The settings gate (`settingsComplete`) hides the submit button when factor email / signer name / signature aren't filled in on Settings → Factoring.
2. The PDF tab was broken (fixed this turn) — without seeing the PDF, the review checkbox stays unchecked, which keeps Submit disabled.

**Change:**
- When `settingsComplete=false`, render an inline yellow card under the preview: "Finish factoring settings to enable sending → [Open Factoring Settings]" instead of silently hiding Submit.
- Always render the Submit button (disabled with tooltip explaining why) so it's never invisible.
- After submit success, scroll the confirmation banner into view and keep it visible for 30s.

## 4. Shift-ticket email confirmation

**Today:** `SendShiftTicketDialog` toasts "Shift ticket sent" then navigates to the thread. There's no record of what was actually sent.

**Change:**
- Show a confirmation dialog (not just a toast) after success: "Sent to {name} at {email} · Schedule attached as Shift-Ticket-{date}.pdf" with View Thread / Done buttons.
- Log the send in `email_send_log` (or our equivalent) keyed by ticket id + recipient so it shows up in the truck's history.
- Add a "Last sent" badge on the shift ticket card (`ShiftTicketLog`) showing date + recipient when one exists.

---

## Technical detail

**Files touched:**
- Migration: alter `incident_truck_finance_contacts` (add 4 bool cols, backfill, partial unique indexes, soft-dedup existing Loren rows)
- `src/services/incident-truck-finance-contacts.ts` — add `receives_*` flags to type + add/update payloads, expose `updateContactFlags`
- `src/components/incidents/FinanceContactsSection.tsx` — 4 toggle chips per row
- `src/components/incidents/FinanceOfficerPicker.tsx` — handle dup conflict, merge flags
- `src/components/shift-tickets/SendShiftTicketDialog.tsx` — filter by `receives_shift_tickets`, add post-send confirmation dialog
- `src/components/incidents/FactoringSubmitCard.tsx` — always-visible Submit with disabled reasons; scroll to confirmation
- Demob / red-card send flows (wherever they live) — filter by the new flags
- `ShiftTicketLog.tsx` — "Last sent" badge

**Out of scope (ask if you want these too):**
- Email open/click tracking
- Per-truck (vs per-incident) finance contact toggles — the toggles apply identically to both scopes
- Resurrecting deleted duplicate contacts

Approve and I'll start with the migration + dedup, then ship the toggles + send-side filtering + confirmation dialog in one pass.
