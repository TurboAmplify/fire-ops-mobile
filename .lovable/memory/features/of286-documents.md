---
name: OF-286 Document Tracking
description: OF-286 invoice upload per incident, missing-form banner, non-blocking closure
type: feature
---

# OF-286 (Emergency Equipment Use Invoice) Tracking

The OF-286 is the signed invoice that closes out a wildland incident assignment.
It is the document that feeds Accounts Receivable.

## Storage
- Table: `public.incident_documents`
  - `incident_id`, `organization_id`, `document_type` (default `of286`),
    `file_url`, `file_name`, `uploaded_by_user_id`
- Bucket: `incident-documents` (private)
  - Path: `{organization_id}/{incident_id}/{uuid}.{ext}`
  - RLS scoped by org id (first folder segment).

## UI surfaces
- `src/components/incidents/OF286UploadCard.tsx` — upload/replace/remove card on
  the incident detail page. Green when present, amber when missing.
- `src/pages/IncidentDetail.tsx` — top-of-page banner appears whenever no OF-286
  is uploaded. Banner turns destructive-red when the incident is `closed` and
  still missing the form.
- `src/pages/Incidents.tsx` — amber "Missing OF-286" chip on each incident row
  that has no uploaded form. Driven by `useIncidentsWithOF286` (bulk lookup).

## Business rules
- Incident closure is **NOT** blocked when missing — owners can still close
  per the user's preference. The missing-form indicator persists until uploaded.
- When uploaded, this is the trigger point for A/R draft creation
  (truck-days × day_rate). A/R wiring lives separately; document upload simply
  invalidates the `incident-of286-flags` query so downstream features react.

## Hooks
- `useIncidentDocuments(incidentId, type?)`
- `useCreateIncidentDocument(incidentId)`
- `useDeleteIncidentDocument(incidentId)`
- `useIncidentsWithOF286(incidentIds)` — Set lookup for list views.
