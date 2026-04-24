/**
 * Bundle individual paystub PDFs into one merged document. Uses jsPDF directly
 * so we don't depend on PDF-merging libraries — we just rebuild each paystub
 * inside one shared document.
 */
import type { CrewPayrollLine } from "@/lib/payroll";
import { shareOrDownload, safeFilename } from "./share";

interface Args {
  lines: CrewPayrollLine[];
  organizationName: string;
  periodLabel: string;
  filenameBase: string;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPaystub(doc: any, line: CrewPayrollLine, organizationName: string, periodLabel: string, pageW: number, margin: number) {
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(organizationName, margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Earnings Statement", margin, y);
  y += 6;
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("EMPLOYEE", margin, y);
  doc.text("PAY PERIOD", pageW - margin, y, { align: "right" });
  y += 11;
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(line.name, margin, y);
  doc.text(periodLabel, pageW - margin, y, { align: "right" });
  y += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(line.role, margin, y);
  doc.text(`Pay Date: ${new Date().toLocaleDateString()}`, pageW - margin, y, { align: "right" });
  y += 22;

  // Earnings table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 9, pageW - margin * 2, 14, "F");
  doc.text("EARNINGS", margin + 4, y);
  doc.text("HOURS", pageW - margin - 200, y, { align: "right" });
  doc.text("RATE", pageW - margin - 100, y, { align: "right" });
  doc.text("AMOUNT", pageW - margin - 4, y, { align: "right" });
  y += 16;

  doc.setFont("helvetica", "normal");
  const isDaily = line.payMethod === "daily";

  if (isDaily && line.dailyRate) {
    doc.text("Daily Rate", margin + 4, y);
    doc.text(String(line.shiftCount ?? 0), pageW - margin - 200, y, { align: "right" });
    doc.text(`$${fmt(line.dailyRate)}`, pageW - margin - 100, y, { align: "right" });
    doc.text(`$${fmt((line.shiftCount ?? 0) * line.dailyRate)}`, pageW - margin - 4, y, { align: "right" });
    y += 14;
  } else {
    doc.text("Regular", margin + 4, y);
    doc.text(line.regularHours.toFixed(2), pageW - margin - 200, y, { align: "right" });
    doc.text(`$${fmt(line.hourlyRate)}`, pageW - margin - 100, y, { align: "right" });
    doc.text(`$${fmt(line.regularPay)}`, pageW - margin - 4, y, { align: "right" });
    y += 13;

    if (line.hwPay > 0) {
      doc.text("H&W", margin + 4, y);
      doc.text(line.regularHours.toFixed(2), pageW - margin - 200, y, { align: "right" });
      doc.text(`$${fmt(line.hwRate)}`, pageW - margin - 100, y, { align: "right" });
      doc.text(`$${fmt(line.hwPay)}`, pageW - margin - 4, y, { align: "right" });
      y += 13;
    }

    if (line.overtimeHours > 0) {
      doc.text("Overtime (1.5x)", margin + 4, y);
      doc.text(line.overtimeHours.toFixed(2), pageW - margin - 200, y, { align: "right" });
      doc.text(`$${fmt(line.hourlyRate * 1.5)}`, pageW - margin - 100, y, { align: "right" });
      doc.text(`$${fmt(line.overtimePay)}`, pageW - margin - 4, y, { align: "right" });
      y += 13;
    }
  }

  // Adjustments
  if (line.adjustments.length > 0) {
    line.adjustments.forEach((adj) => {
      const label = adj.type === "hours"
        ? `Adjustment (${adj.hours?.toFixed(2)} hrs)`
        : "Adjustment (flat)";
      doc.text(label, margin + 4, y);
      doc.text("", pageW - margin - 200, y, { align: "right" });
      doc.text("", pageW - margin - 100, y, { align: "right" });
      doc.text(`$${fmt(adj.amount)}`, pageW - margin - 4, y, { align: "right" });
      y += 11;
      if (adj.reason) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`  Memo: ${adj.reason}`, margin + 4, y);
        doc.setTextColor(0);
        doc.setFontSize(9);
        y += 11;
      }
    });
  }

  y += 4;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Gross Pay", margin + 4, y);
  doc.text(`$${fmt(line.grossPay)}`, pageW - margin - 4, y, { align: "right" });
  y += 18;

  // Deductions
  if (line.deductions) {
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 9, pageW - margin * 2, 14, "F");
    doc.text("DEDUCTIONS", margin + 4, y);
    doc.text("AMOUNT", pageW - margin - 4, y, { align: "right" });
    y += 16;
    doc.setFont("helvetica", "normal");

    const d = line.deductions;
    const rows: [string, number][] = [
      [`Federal (${d.federalPct.toFixed(1)}%)`, d.federal],
      [`Social Security (${d.ssPct.toFixed(2)}%)`, d.socialSecurity],
      [`Medicare (${d.medicarePct.toFixed(2)}%)`, d.medicare],
    ];
    if (d.statePct > 0) rows.push([`State (${d.statePct.toFixed(1)}%)`, d.state]);
    if (d.other > 0) rows.push(["Other", d.other]);

    rows.forEach(([label, amt]) => {
      doc.text(label, margin + 4, y);
      doc.text(`$${fmt(amt)}`, pageW - margin - 4, y, { align: "right" });
      y += 12;
    });

    y += 4;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Total Deductions", margin + 4, y);
    doc.text(`$${fmt(d.total)}`, pageW - margin - 4, y, { align: "right" });
    y += 18;

    doc.setFillColor(0, 100, 0);
    doc.setTextColor(255);
    doc.rect(margin, y - 12, pageW - margin * 2, 22, "F");
    doc.setFontSize(13);
    doc.text("NET PAY", margin + 8, y + 2);
    doc.text(`$${fmt(line.netPay ?? line.grossPay)}`, pageW - margin - 8, y + 2, { align: "right" });
    doc.setTextColor(0);
    doc.setFontSize(9);
  }
}

export async function downloadPaystubsBundle({ lines, organizationName, periodLabel, filenameBase }: Args) {
  if (lines.length === 0) throw new Error("No crew members in range to export.");
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  lines.forEach((line, idx) => {
    if (idx > 0) doc.addPage();
    renderPaystub(doc, line, organizationName, periodLabel, pageW, margin);
  });

  const blob = doc.output("blob");
  shareOrDownload(safeFilename(filenameBase, "pdf"), blob, "application/pdf");
}
