## Problem

The FO workflow for OF-286 has **three** inbound variants, not two:

1. **Draft for review only** — FO wants eyes on it, *not* a signature yet.
2. **Review and sign** — FO wants you to sign and return.
3. **Final, FO-signed** — FO sends back her countersigned final copy.

Today the classifier only knows #2 and #3. Anything that isn't `of286_finance_signed` becomes "needs signature," which is why the Ash Pole draft showed a Sign prompt and you ended up signing the review copy.

## Goal

Have the AI pick the correct intent from the PDF + email body, surface it clearly in the inbox/thread, prevent accidental signing on review-only drafts, and let the user override when the AI is wrong.

## Changes

### 1. Smarter classifier (`supabase/functions/incoming-email/index.ts`)

- Actually feed the PDF bytes to the model (currently the base64 is ignored — only filename is used).
- Also pass the email **subject + body text** to the model — that's where "for your review," "please sign and return," "final signed copy attached," etc. live.
- Expand the returned `stage` enum to:
  - `of286_review_only` — draft, no signature requested
  - `of286_awaiting_signature` — sign and return
  - `of286_finance_signed` — final countersigned copy
- Keep a conservative fallback: if confidence < 0.6 on the sign-vs-review distinction, default to `of286_review_only` (safer — never auto-prompts a sign action that wasn't asked for).

### 2. Document stage mapping (`incident_documents.stage`)

Map classifier stage → `incident_documents.stage`:
- `of286_review_only` → `review`
- `of286_awaiting_signature` → `original`
- `of286_finance_signed` → `finance_signed`

(`stage` is a text column, no migration needed.)

### 3. Notifications

- `review_only` → title "OF-286 draft to review" / body "...sent a draft for your review. No signature requested."
- `awaiting_signature` → existing "OF-286 needs review & signature"
- `finance_signed` → existing "OF-286 signed copy received"

### 4. Inbox + thread UI

**`src/services/threads.ts`** — `needs_signature` flips on only when an unsigned `incident_documents` row has `stage = 'original'` (i.e. `awaiting_signature`). `review` stage never triggers the pill.

**`src/components/messages/ThreadListItem.tsx`** — show one of three small pills based on the latest OF-286 doc on the thread:
- "Review only" (muted)
- "Needs signature" (amber, existing)
- "Final signed" (green)

**`src/components/messages/ThreadView.tsx`** (attachment row) — same three-state badge on the OF-286 attachment chip, and:
- On `review` stage: primary action is "Mark reviewed" + secondary "Reply"; Sign button is hidden behind a "Sign anyway" overflow item.
- On `original` stage: primary action is "Review & sign" (today's behavior).
- On `finance_signed`: read-only, "View final" + "Save to incident."

### 5. Manual override

Small kebab menu on the attachment chip: **"Change classification…"** → bottom sheet with the three options + "Not an OF-286." Writes back to `message_attachments.auto_classified_stage` and updates/creates the linked `incident_documents.stage`. Logs to `incident_document_audit`. This is the escape hatch for when the AI guesses wrong.

### 6. One-off fix for the Ash Pole thread

After deploy, reclassify the existing `incident_documents` row for thread `0ac8ebcf-…` from `original` → `review` so the misleading "Needs signature" pill drops off and the Sign action stops being primary. Done as a one-row update via the manual-override path (or a tiny SQL note in the migration if you'd rather).

## Out of scope

- No schema migration required (using existing `stage` text column + existing classifier columns).
- No change to outbound send flow — once the user does sign and reply, today's logic already attaches the signed PDF and the new `needs_signature` rule will clear the pill.

## Technical notes

- Gemini 2.5 Flash Lite supports PDF input via `image_url` with a `data:application/pdf;base64,...` URI through the Lovable AI gateway; we'll send the first ~2 pages worth (truncate if > ~4 MB) plus the email subject/body as a second user message.
- Prompt will explicitly list the three stages with one-line cues each, and require `confidence_stage` separate from `confidence_type` so we can apply the conservative fallback only to the stage decision.
