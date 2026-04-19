import type { ShiftTicket } from "@/services/shift-tickets";
import type { ShiftTicketAuditEntry } from "@/services/shift-ticket-audit";

async function getJsPdf() {
  const { default: jsPDF } = await import("jspdf");
  return jsPDF;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function eventLabel(t: ShiftTicketAuditEntry["event_type"]): string {
  switch (t) {
    case "field_change":
      return "Field change";
    case "signature_captured":
      return "Signature captured";
    case "signature_cleared":
      return "Signature cleared";
    case "locked":
      return "Locked";
    case "unlocked":
      return "Admin unlocked";
    case "relocked":
      return "Re-locked";
    case "override_edit":
      return "Edit while locked";
    default:
      return t;
  }
}

/**
 * Renders the audit trail for a shift ticket as a standalone PDF.
 *
 * The page is never empty — it always lists at least the signature events
 * derived directly from the ticket so a printed copy can stand alone as
 * proof of who signed and when.
 */
export async function generateAuditTrailPdf(
  ticket: ShiftTicket,
  audit: ShiftTicketAuditEntry[]
): Promise<void> {
  const JsPDF = await getJsPdf();
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Shift Ticket — Audit Trail", margin, y);
  y += 18;

  // Sub-header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const subLines = [
    `Incident: ${ticket.incident_name || "—"}${ticket.incident_number ? ` (#${ticket.incident_number})` : ""}`,
    `Resource Order: ${ticket.resource_order_number || "—"}`,
    `Equipment: ${ticket.equipment_make_model || "—"}${ticket.license_id_number ? ` · ${ticket.license_id_number}` : ""}`,
    `Status: ${ticket.status.toUpperCase()}`,
    `Generated: ${fmtDateTime(new Date().toISOString())}`,
  ];
  for (const line of subLines) {
    doc.text(line, margin, y);
    y += 12;
  }
  y += 6;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Always-present signature events synthesised from the ticket itself.
  // These are the legally meaningful timestamps and must appear even when
  // no field-level audit entries exist yet.
  const synthesised: ShiftTicketAuditEntry[] = [];
  if (ticket.contractor_rep_signed_at) {
    synthesised.push({
      id: "synth-contractor",
      shift_ticket_id: ticket.id,
      organization_id: ticket.organization_id ?? "",
      event_type: "signature_captured",
      field_name: "Contractor signature",
      old_value: null,
      new_value: ticket.contractor_rep_name || null,
      reason: null,
      actor_user_id: null,
      actor_name: ticket.contractor_rep_name || null,
      occurred_at: ticket.contractor_rep_signed_at,
    });
  }
  if (ticket.supervisor_signed_at) {
    synthesised.push({
      id: "synth-supervisor",
      shift_ticket_id: ticket.id,
      organization_id: ticket.organization_id ?? "",
      event_type: "signature_captured",
      field_name: "Supervisor signature (locks ticket)",
      old_value: null,
      new_value: ticket.supervisor_name || null,
      reason: null,
      actor_user_id: null,
      actor_name: ticket.supervisor_name || null,
      occurred_at: ticket.supervisor_signed_at,
    });
  }

  // Merge & sort: real audit rows take precedence over synthesised ones for
  // the same signature timestamp (in case a real audit row was logged).
  const merged: ShiftTicketAuditEntry[] = [...synthesised, ...audit].sort(
    (a, b) => a.occurred_at.localeCompare(b.occurred_at)
  );

  if (merged.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text(
      "No audit events recorded yet. Audit logging begins after the first signature is captured.",
      margin,
      y
    );
    doc.save(`audit-trail-${ticket.id.slice(0, 8)}.pdf`);
    return;
  }

  // Column layout
  const cols = {
    when: { x: margin, w: 110 },
    event: { x: margin + 115, w: 110 },
    field: { x: margin + 230, w: 130 },
    change: { x: margin + 365, w: pageWidth - margin - (margin + 365) },
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("WHEN", cols.when.x, y);
  doc.text("EVENT", cols.event.x, y);
  doc.text("FIELD", cols.field.x, y);
  doc.text("CHANGE / DETAILS", cols.change.x, y);
  y += 4;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (const e of merged) {
    const change = (() => {
      if (e.event_type === "field_change") {
        const from = e.old_value || "(empty)";
        const to = e.new_value || "(empty)";
        return `${from}  →  ${to}`;
      }
      if (e.event_type === "signature_captured") {
        return e.new_value ? `Signed by ${e.new_value}` : "Signature captured";
      }
      if (e.event_type === "signature_cleared") {
        return "Signature removed";
      }
      if (e.event_type === "unlocked") {
        return e.reason ? `Reason: ${e.reason}` : "Admin override";
      }
      if (e.event_type === "relocked") return "Auto-relocked after save";
      if (e.event_type === "locked") return "Locked by supervisor signature";
      if (e.event_type === "override_edit") {
        const from = e.old_value || "(empty)";
        const to = e.new_value || "(empty)";
        return `${from}  →  ${to}`;
      }
      return "";
    })();

    const whenLines = doc.splitTextToSize(fmtDateTime(e.occurred_at), cols.when.w);
    const eventLines = doc.splitTextToSize(eventLabel(e.event_type), cols.event.w);
    const fieldLines = doc.splitTextToSize(e.field_name || "—", cols.field.w);
    const changeLines = doc.splitTextToSize(change, cols.change.w);
    const actorLine = e.actor_name ? `by ${e.actor_name}` : "";
    const allChangeLines = actorLine
      ? [...changeLines, actorLine]
      : changeLines;

    const rowHeight =
      Math.max(whenLines.length, eventLines.length, fieldLines.length, allChangeLines.length) *
        10 +
      4;

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.text(whenLines, cols.when.x, y);
    doc.text(eventLines, cols.event.x, y);
    doc.text(fieldLines, cols.field.x, y);
    doc.text(allChangeLines, cols.change.x, y);

    y += rowHeight;
    doc.setDrawColor(230);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  }

  // Footer note
  if (y + 24 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text(
    "This audit trail is append-only. Entries cannot be modified or deleted once written.",
    margin,
    y
  );

  doc.save(`audit-trail-${ticket.id.slice(0, 8)}.pdf`);
}
