# Actual Profit, Send Shift Ticket & Hotel Folios

Three connected pieces of work:

1. **P&L:** add an "Actual Profit (OF-286)" column alongside the existing one (which becomes "Projected Profit").
2. **Shift Tickets:** add a real "Send Ticket" button after supervisor signs that opens the iOS/Android share sheet (Mail, Messages, Gmail, etc.).
3. **Hotel folios:** when a ticket has Lodging selected, the send flow asks the user to pick an existing lodging expense **or** snap a folio photo on the spot, and attaches it to the email along with the OF-297 PDF.

---

## 1. P&L — Projected vs. Actual Profit

### What the user sees
The P&L table gets a new money column. Existing "Profit" → renamed **Projected Profit** (revenue from truck day rate × days, today's calculation). New **Actual Profit (OF-286)** column reads the dollar amount actually invoiced on the OF-286 for that incident. Same on PDF/Excel/CSV exports.

```text
Incident   Labor TC   Vendor Exp   Crew Reimb   Days   Revenue   Projected Profit   OF-286 Total   Actual Profit
```

When no OF-286 has been entered, **OF-286 Total** and **Actual Profit** show "—". A small footer note explains the difference.

### How
- Add `of286_invoice_total` (numeric) and `of286_entered_at` (timestamptz) columns to `incident_documents` (the existing OF-286 upload row already exists per incident).
- After uploading an OF-286 PDF, the upload card prompts for the invoice total (single number). Editable later.
- `pl-report.ts`:
  - Fetch OF-286 totals per incident in scope.
  - Compute `actualRevenue = of286Total ?? null` and `actualProfit = of286Total != null ? of286Total - totalCost : null`.
  - Rename the existing `profit` field to **projected profit** in the column header only (data field stays `profit` to avoid a cascading rename); add `actualRevenue`, `actualProfit`, `of286Total` to the row + totals.
- `AdminReports.tsx` PLReportCard: add the two columns to CSV / Excel / PDF exporters and the on-screen description.

---

## 2. Send Shift Ticket — native share sheet

### What the user sees
After supervisor signs (ticket is "Final"), the form shows a new primary **Send Ticket** button next to Export PDF. Tapping it:
1. Generates the OF-297 PDF.
2. If the ticket has any personnel entry with **Lodging** checked → opens the Folio Picker sheet (step 3 below). Otherwise skips straight to step 4.
3. Folio Picker resolves which file(s) to attach.
4. Opens the native share sheet (iOS: Mail / Messages / Gmail / Outlook / Drive; Android similar) pre-filled with subject, body, and the PDF + folio attachments.

Web fallback: opens a `mailto:` with subject/body and downloads the attachments locally with a toast "Attach the downloaded files to your email."

### How
- Add `@capacitor/share` and `@capacitor/filesystem` (already on Capacitor; share isn't installed yet).
- New helper `src/lib/share-ticket.ts` with `shareShiftTicket({ pdfBlob, folioBlobs, subject, body, fileName })`:
  - On Capacitor: writes blobs to cache dir, calls `Share.share({ files: [...] })`.
  - On web: triggers download + `mailto:` link.
- `ShiftTicketForm.tsx`: new `Send Ticket` button visible only when `supervisorSigUrl && !editingLocked` (or always when locked). Wire it through a new `onSendTicket` prop on the form, implemented in `ShiftTicketEdit.tsx` where the PDF generator already runs.

---

## 3. Hotel Folio Picker

Triggered by the Send flow whenever any personnel entry on the ticket has `lodging === true`.

### What the user sees
A bottom sheet titled **"Attach hotel folio"** showing:

```text
[ + Take photo of folio ]      ← camera capture
[ + Pick from photos ]         ← file input
─────────────────────────────
Existing lodging expenses for this incident:
  Best Western — $142.50  (May 14)   [select]
  Hampton Inn — $158.00   (May 15)   [select]
─────────────────────────────
[ Skip — send without folio ]
```

- One date per lodging entry → if multiple lodging dates, sheet asks one folio per date (or lets user attach one PDF that covers all).
- "Take photo" goes through the existing receipt-capture path so the photo is **also** saved as an Expense (category = "Lodging", linked to the incident) — this guarantees the folio shows up in the next P&L run as a real cost. After capture, control returns to the Send flow with that file attached.

### How
- New `src/components/shift-tickets/FolioPickerSheet.tsx`.
- Hook `useIncidentLodgingExpenses(incidentId)` filters `expenses` where `category ILIKE 'lodging'` for the incident.
- "Take photo" reuses `CrewPhotoUpload`-style camera input → uploads to the existing `expense-receipts` bucket → creates an `expenses` row (status `submitted`, category `lodging`, amount blank for user to fill later from the Expenses page) → returns the Blob to the Send flow.
- Selected expense receipts are downloaded via the existing signed-URL helper and added as attachments.

---

## Files

**New**
- `src/components/shift-tickets/FolioPickerSheet.tsx`
- `src/lib/share-ticket.ts`
- `src/hooks/useIncidentLodgingExpenses.ts`
- `supabase/migrations/<ts>_of286_invoice_total.sql`

**Edited**
- `src/services/reports/pl-report.ts` — fetch OF-286 totals, add actual columns
- `src/pages/AdminReports.tsx` — P&L exporters & description
- `src/components/incidents/OF286UploadCard.tsx` — prompt for invoice total after upload, display & edit
- `src/hooks/useIncidentDocuments.ts` — pass through new fields
- `src/components/shift-tickets/ShiftTicketForm.tsx` — Send Ticket button
- `src/pages/ShiftTicketEdit.tsx` — `onSendTicket` handler that wires PDF + Folio Picker + share helper
- `package.json` — add `@capacitor/share`, `@capacitor/filesystem`

## What to test
1. Upload an OF-286, enter $25,000 invoice total → P&L shows "Actual Profit" = 25,000 − Total Cost.
2. P&L row with no OF-286 still shows Projected Profit; Actual columns show "—".
3. Sign a ticket as supervisor, tap Send Ticket on iOS → share sheet opens with PDF attached.
4. Sign a ticket that has a Lodging row → Folio Picker appears; pick existing expense → share sheet has both PDF + folio image.
5. Folio Picker → Take photo → photo becomes a lodging expense AND attaches to the email.
6. Web/desktop fallback: clicking Send downloads files and opens email client with subject/body.
