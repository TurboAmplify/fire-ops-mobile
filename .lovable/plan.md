## Two problems, two fixes

### 1) Recover the deleted shift tickets for 2026 Long Term Severity

What happened in the database:
- Only one "2026 Long Term Severity" incident exists now (`9b9ca1aa…`). The other was hard‑deleted, which cascaded its `incident_trucks` row and every `shift_tickets` row attached to it — they are gone from the DB (no soft‑deletes, no audit rows).
- The 3 outbound shift‑ticket emails from those days are still in this incident's message threads with the rendered PDFs attached:
  - 2026‑06‑02 shift (sent 06‑03)
  - 2026‑06‑01 shift (sent 06‑02, two versions)
- The remaining truck on the incident is DL62 → `incident_truck_id = ed22a43b‑a4bf‑472e‑80a9‑dc901f7660ff`.

Because the structured ticket data (equipment entries, crew, times, signatures) was deleted with the truck, the only source of truth left is the PDF in each email. The cleanest recovery path:

1. **Add a "Restore to shift ticket" action on PDF attachments inside the message thread.** When tapped on a `*.pdf` attachment whose thread is on an incident, it:
   - Calls the existing `parse-shift-ticket` edge function on the attachment's signed URL.
   - Creates a new `shift_tickets` row on the thread's incident's remaining `incident_truck` (DL62 for this incident), in `draft` status, pre-filled with the parsed fields (equipment + personnel entries, dates, times, remarks, signatures left blank for re-sign).
   - Attaches the original PDF reference in `remarks` ("Restored from email PDF on …") so the user can verify.
   - Toasts with a deep‑link to the new draft for review.

2. **Restore the three Long Term Severity tickets specifically** by running that flow now for those three attachments and pointing the new rows at DL62. The user reviews/edits each in the shift‑ticket editor; nothing is auto‑finalized.

Trade‑off the user should know: AI parsing of a rendered PDF won't recover signatures and may be imperfect on crew times — the restored tickets land as **drafts**, ready for review, not as finals. Re‑signing is required.

### 2) Make the Schedule of Accounts viewable before sending

Symptom: After "Generate Schedule of Accounts," the "Open preview PDF" link uses a `blob:` URL with `target="_blank"`. In the iOS/Android in‑app webview the new tab either fails to open or shows a blank page, so the user can't review before sending.

Fix in `src/components/incidents/FactoringSubmitCard.tsx`:
- Render the preview **inline** in a fixed‑aspect iframe right in the card (use the already‑uploaded signed URL from Supabase storage via `getViewableUrl(pendingPdf.url)`, not the `blob:` URL — webviews handle the signed https URL reliably).
- Keep a secondary "Open in new tab" link as a fallback for desktop browsers.
- Keep the existing flow order: **Generate → Preview (inline) → Submit**. Submit stays disabled until a preview exists (already the case).
- Also wire the same `getViewableUrl` fallback to the existing "View PDF" button under "Submitted" so previously‑sent schedules open reliably too.

No schema changes. No edits to the PDF generator itself — last loop's layout work stays as is, the user just needs to actually see it.

## Technical notes

- New UI: in `MessageBubble` / `AttachmentChip`, when `mime_type === 'application/pdf'` and the parent thread has `incident_id`, show a small "Restore as shift ticket" menu item next to the existing download. Wire it to a new `recoverShiftTicketFromPdf(attachmentId, incidentTruckId)` helper in `src/services/shift-tickets.ts` that downloads the attachment, calls `supabase.functions.invoke('parse-shift-ticket', { body: { fileUrl } })`, then inserts a `shift_tickets` row.
- If the incident has >1 active `incident_truck`, prompt for which truck to attach to. For 2026 Long Term Severity there is exactly one (DL62), so it's a one‑tap restore.
- `parse-shift-ticket` already exists at `supabase/functions/parse-shift-ticket/index.ts`; reuse without changes if its output schema matches `ShiftTicket` fields (verify in the build step and patch the mapping if it returns a slightly different shape).
- Preview iframe: `<iframe src={signedUrl} className="w-full h-[70vh] rounded-md border" />` inside the existing preview block. `URL.revokeObjectURL` cleanup on the old `blob:` path removed.

## Out of scope

- No undelete of the original ticket rows (cascade‑deleted, no backup snapshot to pull from).
- No change to factoring email content or OF‑286 attachment behavior.
- No change to the Schedule PDF layout itself.