
# Factoring (WideQ Financial) — Schedule of Accounts workflow

A new opt-in module that lets owner/admins package the finance-signed OF-286(s) for an incident into a WideQ "Schedule of Accounts" PDF and send it to the org's factoring contact.

## 1. Super-admin toggle (per org)

- Add `modules_enabled.factoring` (boolean) on `organizations` (same pattern as `payroll`).
- New component `src/components/super-admin/FactoringAccessToggle.tsx` mirroring `OrgPayrollToggle`.
- Wire into `SuperAdminOrgDetail.tsx`.
- When toggled on for Dry Lightning, the org's owner/admins see the factoring features below; everyone else (engine_boss, crew_member) sees nothing.

## 2. Org factoring profile (admin-only onboarding form)

New table `public.org_factoring_settings` (one row per org):

- `organization_id` (PK/FK)
- `factor_company_name` (default `WideQ Financial LLC`)
- `factor_contact_name` (e.g. `Anita Hall`)
- `factor_contact_email`
- `factor_contact_phone`
- `reserve_percent` (numeric, default `15.00`)
- `agreement_date` (date — the factoring agreement effective date inserted in clause 2)
- `signer_name` (org owner name)
- `signer_title` (default `Owner`)
- `signature_url` (saved signature image; reuse `SignaturePicker` + `incident-documents` bucket pattern)
- `next_schedule_number` (int, default 1; auto-increments per submission)

RLS: select/update restricted to `is_org_admin(auth.uid(), organization_id)`. GRANTs for `authenticated` + `service_role`.

UI: `src/pages/OrgFactoringSettings.tsx` (linked from `OrgSettings.tsx`, admin-only, gated behind `modules_enabled.factoring`). Lets the owner pre-fill recurring info + capture/replace their signature. Banner appears on incident page when profile incomplete.

## 3. Schedule generation on the incident

On `IncidentDetail` Overview, when factoring is enabled for the org AND the incident has at least one `incident_documents` row with `stage='finance_signed'` (type `of286`):

- New `FactoringSubmitCard` component shows:
  - List of finance-signed OF-286s on this incident, each row with parsed/entered invoice metadata (debtor agency, invoice number, amount, date) — editable inline.
  - Reserve % (defaulted from org profile, editable per submission).
  - Auto-computed totals: count of accounts, total amount sold, reserve $ = total × reserve%.
  - "Generate Schedule" → renders PDF (pdf-lib) and opens review modal.
  - "Submit to WideQ" → emails the contact with the Schedule PDF + each finance-signed OF-286 PDF attached, logs an audit event, and increments `next_schedule_number`.

### AI extraction to pre-fill the schedule

New edge function `parse-of286` (mirrors `parse-shift-ticket`/`parse-agreement`):
- Input: signed file URL
- Uses Lovable AI (`google/gemini-2.5-pro`) with structured output to extract:
  - `dispatch_office` (Seller — e.g. "Bureau of Land Management")
  - `invoice_number` (resource order / agreement #)
  - `invoice_amount` (uses existing `of286_invoice_total` if already entered, otherwise parsed)
  - `invoice_date` (finance-signed date or doc date)
  - `account_debtor` (incident host agency / paying office)
- Result cached on `incident_documents` in new JSONB column `of286_parsed` and editable in the card.

## 4. Schedule of Accounts PDF

`src/lib/pdf-schedule-of-accounts.ts` using pdf-lib generates a single-page PDF matching the WideQ template:

- Header: "WideQ Financial LLC — SCHEDULE OF ACCOUNTS"
- DATE (today) · SCHEDULE NO. (from `next_schedule_number`)
- SELLER: dispatch office (taken from the OF-286s; if multiple, lists each)
- Totals: count, total amount, reserve
- Table rows: one per finance-signed OF-286 (Account Debtor / Invoice # / Amount / Date)
- Clauses 1–6 with `signer_title` substituted into clause 1 and `agreement_date` into clause 2
- "IN WITNESS WHEREOF" line filled with today's day/month/year
- "By:" line stamps `signature_url`; "Print Name:" = `signer_name`; "Title:" = `signer_title`

## 5. Submission delivery

- New edge function `send-factoring-submission` (verify_jwt=true) — accepts `{ incident_id, document_ids[], reserve_percent, line_items[] }`.
- Reuses the Resend connector + per-org sender (`<email_handle>@mail.fireopshq.com`) and Reply-To token pattern.
- Subject: `Schedule #N — <Incident Name> — <Org>`.
- Body: short cover note to Anita (or the configured contact) with totals.
- Attachments: generated Schedule PDF + every selected finance-signed OF-286 PDF.
- On success: insert `factoring_submissions` row (org_id, incident_id, schedule_number, total_amount, reserve_amount, recipient_email, submitted_by, submitted_at, pdf_url, document_ids[]) + audit log entry.

New table `public.factoring_submissions` with admin-only RLS (select for engine_boss+, insert/update admin-only via the edge function using service role).

## 6. Notification when FO returns the OF-286

Already: `incoming-email` ingests finance replies and creates `incident_documents` rows. Extend it to:
- When a new `stage='finance_signed'` doc lands AND the org has `modules_enabled.factoring`, insert a row into `app_notifications` ("Final OF-286 received — ready to submit for factoring") for org admins, deep-linking to the incident overview.

## Rollout order

1. Migration: `modules_enabled.factoring`, `org_factoring_settings`, `factoring_submissions`, `incident_documents.of286_parsed`, GRANTs + RLS.
2. Super-admin `FactoringAccessToggle` + wire into `SuperAdminOrgDetail`.
3. `OrgFactoringSettings` page + link in `OrgSettings`.
4. `parse-of286` edge function.
5. `pdf-schedule-of-accounts.ts` + `FactoringSubmitCard` on `IncidentDetail`.
6. `send-factoring-submission` edge function + audit/notification + incoming-email notification hook.
7. Enable for Dry Lightning, pre-fill Anita Hall / WideQ defaults via insert.

## Out of scope (ask if needed)

- Custom WideQ "agreement on file" upload/storage.
- Editing the schedule PDF template per-org (assumes all factoring orgs use the same WideQ form).
- Tracking remittance/payment status after submission (could be a Phase 2 on `factoring_submissions`).
- Multiple factoring contacts per org (one contact per org for now; orgs that aren't Dry Lightning just configure their own contact in step 2).
