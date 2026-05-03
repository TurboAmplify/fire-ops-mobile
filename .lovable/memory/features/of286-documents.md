---
name: OF-286 Document Tracking
description: 3-stage OF-286 workflow (original/contractor-signed/finance-signed) with on-device signing and audit trail
type: feature
---

# OF-286 (Emergency Equipment Use Invoice) Tracking

The OF-286 is the signed invoice that closes out a wildland incident assignment.
It is the document that feeds Accounts Receivable.

## Three-stage workflow
1. **original** — Government/incident sends the unsigned OF-286. User uploads it.
2. **contractor_signed** — User signs on-device (SignaturePicker). pdf-lib stamps
   the signature onto the last page of the original PDF (or wraps an image source
   into a PDF first). The signed PDF auto-downloads so the user can email it to
   their finance person.
3. **finance_signed** — Finance signs externally and emails it back. User uploads
   the final version. This stage triggers the invoice-total prompt and powers
   "Actual Profit" on the P&L.

All three versions are kept (`incident_documents.stage`, with
`parent_document_id` linking signed versions back to the original).

## Storage
- Table: `public.incident_documents`
  - Adds: `stage`, `parent_document_id`, `signature_url`, `signed_by_user_id`,
    `signed_by_name`, `signed_at`
- Bucket: `incident-documents` (private), org-scoped paths
- Signature image stored alongside as `sig-{uuid}.png` in same bucket

## Audit trail
- Table: `public.incident_document_audit` — append-only, RLS by org
- Events captured: `uploaded`, `signed`, `downloaded`, `replaced`, `deleted`
- No UPDATE / no DELETE policies (restrictive false)
- Surfaced as collapsible list inside `OF286UploadCard`

## UI surfaces
- `src/components/incidents/OF286UploadCard.tsx` — three numbered stage rows,
  each with its own actions (sign, download, replace, delete). Always rendered
  on the incident Overview tab now (not just demob/closed).
- `src/lib/pdf-sign.ts` — pdf-lib helper that stamps a signature image + signer
  name + timestamp onto the last page of the source PDF.

## Hooks
- `useIncidentDocuments(incidentId, type?)`
- `useCreateIncidentDocument(incidentId)` — auto-logs upload/sign event
- `useDeleteIncidentDocument(incidentId)` — takes `{id, stage, file_name}`,
  auto-logs delete event
- `useLogIncidentDocumentEvent(incidentId)` — for download/replace events
- `useIncidentDocumentAudit(incidentId, type?)`
- `useIncidentsWithOF286(incidentIds)` — Set lookup for list views

## Business rules
- Incident closure is NOT blocked when missing — owners can still close.
- Missing-form indicator (amber) shows on incident pages until original uploaded.
- Replacing a stage's document creates a new row + logs a `replaced` event;
  the old row is deleted.
