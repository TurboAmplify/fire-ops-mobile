# Fix: Schedule of Accounts PDF doesn't match WideQ template

## Problem

The generated Schedule of Accounts I send to Anita is laid out from scratch (header text, table proportions, certification wording, signature block) — it does not match the WideQ Financial template you originally attached. The OF-286 attachment itself is fine (the finance-signed file is the one being sent); the only fix is the schedule layout/wording.

## Approach

Rebuild `src/lib/pdf-schedule-of-accounts.ts` so its output is a 1:1 visual match of Anita's blank template, then re-preview on Ashpole before any send.

### 1. Re-anchor on the template

The template was attached as 2 images back in your original factoring request, but I want to be 100% sure I'm matching what Anita actually expects today. I'd like you to re-attach the blank WideQ "Schedule of Accounts" PDF (or a clean screenshot of page 1) in your next message. I'll use it as the visual source of truth.

If you prefer not to re-upload, I'll work from the original attached images — just say so.

### 2. Rewrite the PDF generator

Replace the current ad-hoc layout in `pdf-schedule-of-accounts.ts` with one that mirrors the template's:

- Title block ("WideQ Financial LLC" branding + "Schedule of Accounts" heading) at the exact position/size used in the template
- DATE / SCHEDULE NO. row formatted like the template (right-aligned schedule number, same font weight)
- SELLER line
- Totals block (Number of Accounts Sold / Total Amount Sold / Reserve %)
- Accounts table — same column order, widths, header style, and row height as the template
- Certification paragraphs 1–6 — verbatim wording from the template (currently mine is paraphrased)
- "IN WITNESS WHEREOF…" closing line with the day/month/year merge fields
- Signature block: `By: ___` (with embedded signature PNG), `Print Name:`, `Title:` — positioned to match the template

### 3. Keep the existing data wiring intact

No changes to:
- `FactoringSubmitCard` (line items, totals, preview/submit flow)
- `send-factoring-submission` edge function (attachments, recipient, email body)
- `org_factoring_settings` schema
- The finance-signed OF-286 attachment logic

Only the PDF builder changes.

### 4. Verify before sending

After the rewrite, on the Ashpole incident you'll:
1. Click **Generate Schedule of Accounts** → opens the new PDF preview
2. Eyeball it against Anita's template
3. If good, **Submit**; if not, tell me what's off and I'll iterate

I will NOT auto-send a test to Anita.

## Technical notes

- `pdf-lib` + Helvetica/Helvetica-Bold standard fonts (no new deps)
- Certification wording will be copied verbatim from the template so the legal language matches what she's expecting
- The `schedule_number` will continue to draw from `org_factoring_settings.next_schedule_number` (currently 2 for Dry Lightning — the previous Ashpole send already bumped it from 1 to 2)
- Signature PNG embed logic stays the same (auto-stamps `signature_url` from settings onto the `By:` line)

## Out of scope

- OF-286 attachment logic (working correctly — the finance-signed file is what's sent)
- Email body / subject changes
- Adding a per-org overridable schedule template
- Re-sending the existing Ashpole submission (you can regenerate and resubmit after the fix; it'll become Schedule #2)
