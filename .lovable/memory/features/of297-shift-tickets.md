---
name: OF-297 Shift Ticket Module
description: OF-297 Emergency Equipment Shift Ticket form with auto-populated fields, equipment/personnel entries, signatures, draft save, and PDF export
type: feature
---
- Table: shift_tickets (linked to incident_trucks and resource_orders)
- Auto-populates header from resource order parsed data and truck info
- Equipment entries (date/start/stop/total/qty/type/remarks) as JSONB array
- Personnel entries (date/name/op times/standby times/total/remarks) as JSONB array
- Signature capture via full-screen canvas, stored in 'signatures' storage bucket
- PDF generation uses jspdf, matches federal OF-297 form layout
- Routes: /incidents/:id/trucks/:itId/shift-ticket/new and /shift-ticket/:ticketId
- Components in src/components/shift-tickets/
- Service: src/services/shift-tickets.ts, Hook: src/hooks/useShiftTickets.ts
