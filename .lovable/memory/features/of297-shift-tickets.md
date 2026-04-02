---
name: OF-297 Shift Ticket Module
description: OF-297 Emergency Equipment Shift Ticket form with auto-populated fields, equipment/personnel entries, signatures, draft save, PDF export, and duplicate feature
type: feature
---
- Table: shift_tickets (linked to incident_trucks and resource_orders)
- Auto-populates header from resource order parsed data and truck info
- Equipment entries (date/start/stop/total/qty/type/remarks) as JSONB array
- Personnel entries (date/name/op times/standby times/total/remarks) as JSONB array
- Personnel remarks structured: line1=activity type (Travel or Work+context), line2=Lodging or Per Diem, line3=Per Diem if Lodging exists
- work_context field on PersonnelEntry for specifying work details (e.g. "IA2 - Johnson Hill Fire")
- Signature capture via full-screen canvas, stored in 'signatures' storage bucket
- PDF: signatures drawn on white canvas background (prevents black box), name/sig ABOVE lines
- PDF generation uses jspdf, matches federal OF-297 form layout
- Duplicate feature: copies ticket with dates +1 day, clears signatures, opens for editing
- Routes: /incidents/:id/trucks/:itId/shift-ticket/new and /shift-ticket/:ticketId
- Components in src/components/shift-tickets/
- Service: src/services/shift-tickets.ts, Hook: src/hooks/useShiftTickets.ts
