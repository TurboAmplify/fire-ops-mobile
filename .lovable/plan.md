## Goal

Round out FireOps for App Store launch with the missing **accountant hand-off** layer (year-end summaries, A/R, A/P, mileage) and add a clean **OF-286 invoice workflow** so closing an incident properly feeds Accounts Receivable.

Every new report keeps the existing "Estimated — Not Official Tax Calculation" banner. Nothing here turns FireOps into a tax engine — it produces clean exports the CPA copies into their filing software.

---

## 1. OF-286 Upload + Incident Closure Flow

The OF-286 ("Emergency Equipment Use Invoice") is the signed invoice document that drives A/R. We'll wire it into incident closure without blocking the owner.

**Behavior:**
- New `incident_documents` table (or reuse existing `agreements` pattern) with a `document_type` field — `of286`, `of297`, `agreement`, `other`. Upload to a new `incident-documents` storage bucket (private, signed URLs).
- On the **Incident Detail** page: an **OF-286 Invoice** card with upload button (camera/file picker, AI parse optional later). Shows file name, upload date, signed-by names if parseable.
- Closing an incident is **never blocked**. But when an incident is `closed` or `demob` and has no OF-286 attached:
  - A persistent **amber warning chip** ("OF-286 missing") on the incident header
  - A row banner on the **Incidents list**
  - A counter on the **Dashboard**: "X closed incidents missing OF-286"
  - Filter on Incidents list: "Missing OF-286"
- When an OF-286 IS uploaded, the chip turns green ("OF-286 on file") and the file is one-tap viewable.
- The OF-286 file auto-populates an entry in the new **Invoices** table (section 4 below) — `status: ready_to_invoice`, prefilled with revenue from truck-days × day-rate. Owner reviews, edits, marks `sent`.

**Why not block closure:** owners need flexibility in the field; the bright visual indicator + dashboard counter is enough nag without being a wall.

---

## 2. Year-End Tax Packet (1099 / W-2 prep)

Single Reports card producing, for any tax year:
- **W-2 Wage Summary** per employee: YTD gross, federal w/h, SS wages + w/h, Medicare wages + w/h, state w/h
- **1099-NEC Summary** per contractor (driven by new `is_1099_contractor` flag on `crew_compensation`); 1099 crew excluded from W-2 sheet
- **Employer Tax Liability**: total employer SS, Medicare, workers comp YTD, broken out by quarter (Q1-Q4 + Full Year for 941-style totals)

Output: multi-sheet Excel `tax_packet_{year}.xlsx` + PDF for printing.

## 3. Vendor / Accounts Payable Report

Group existing expense data by `vendor`:
- Vendor | # expenses | Total | Categories | Last expense date
- Year/quarter filter
- **1099-MISC vendor flag** so vendors over $600/year that need a 1099-MISC are surfaced

## 4. Accounts Receivable / Invoice Tracker

New `incident_invoices` table:
- `incident_id`, `invoice_number`, `invoice_date`, `amount`, `status` (draft/ready/sent/paid), `sent_date`, `paid_date`, `notes`, `of286_document_id` (FK to incident_documents)
- New **Invoices** screen (admin + payroll-module gated) under `/invoices`: list of all incidents with invoice status, days outstanding, totals by status
- Reports card: **A/R Aging** — outstanding bucketed 0-30 / 31-60 / 61-90 / 90+ days
- Auto-creates a draft invoice row when an incident is closed (with prefilled revenue from P&L logic)
- "Mark sent" / "Mark paid" with date pickers
- One-tap PDF generation: invoice draft from truck-days × rate, attaches OF-286 if present

## 5. Mileage Log

`shift_tickets.miles` already exists. Add a Reports card:
- Per-truck and per-incident mileage rollup by date range
- Editable IRS standard mileage rate in org payroll settings (default $0.67/mi)
- Calculated deductible mileage value
- Excel + PDF

## 6. Per-Diem & Lodging Summary

Already captured in shift ticket personnel remarks. New Reports card aggregating per crew member, per incident: # per-diem days, # lodging nights, totals. Useful for reimbursement audits and Schedule C.

---

## Polish (bundled in)

- **Settings → Payroll → "Tax Year"** field (defaults to current calendar year), used as default range for year-end reports
- **Compliance footer** on every new export: "Estimated values for accountant reference only. Not an official tax filing."
- **"Hand off to accountant"** quick action on the Reports page — runs Tax Packet + A/R + Vendor + Mileage + Per-Diem in one click and zips them
- Dashboard widget: "Closed incidents missing OF-286" counter

---

## Technical changes (for reference)

**Schema:**
- New table `incident_documents` (id, incident_id, organization_id, document_type, file_url, file_name, uploaded_by_user_id, parsed_data jsonb, created_at) — admin RLS via existing org pattern
- New table `incident_invoices` (admin RLS)
- New storage bucket `incident-documents` (private, RLS by org)
- New columns: `crew_compensation.is_1099_contractor`, `crew_compensation.address jsonb`, `crew_compensation.tin_last4`, `org_payroll_settings.mileage_rate numeric default 0.67`, `org_payroll_settings.tax_year_default int`

**Code:**
- Service: `src/services/incident-documents.ts`, `src/services/invoices.ts`
- Hooks: `useIncidentDocuments`, `useInvoices`
- Components: `src/components/incidents/OF286UploadCard.tsx`, `src/components/incidents/MissingOF286Badge.tsx`
- Pages: `src/pages/Invoices.tsx`, `src/pages/InvoiceDetail.tsx` — gated by `AdminGate` + `ModuleGate("payroll")`
- Report fetchers: `tax-packet-report.ts`, `vendor-report.ts`, `ar-invoice-report.ts`, `mileage-report.ts`, `perdiem-report.ts`
- Updates: `IncidentDetail.tsx` (OF-286 card + status badge), `Incidents.tsx` (missing filter + row indicator), `Dashboard.tsx` (counter), `AdminReports.tsx` (5 new cards + bundle action), `incidents.ts` service (auto-create invoice draft on close)
- Reuse existing CSV / Excel / PDF / signed-URL infrastructure — no new export plumbing

---

## What this does NOT do

- No official IRS form generation (W-2, 1099, 941) — just clean summaries for the CPA
- No QuickBooks / Xero integration (could be a later add)
- Does not block incident closure — only flags missing OF-286 visually
- Does not auto-OCR the OF-286 in v1 (manual upload + manual invoice amount entry; AI parse can come later via a `parse-of286` edge function on the same pattern as `parse-shift-ticket`)

After approval I'll implement all 6 sections plus the polish items in one pass.