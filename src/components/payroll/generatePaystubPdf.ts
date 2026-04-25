import type { CrewPayrollLine } from "@/lib/payroll";

interface Args {
  line: CrewPayrollLine;
  organizationName: string;
  periodLabel: string;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generatePaystubPdf({ line, organizationName, periodLabel }: Args): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(organizationName, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Earnings Statement", margin, y);
  y += 6;
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Employee + period
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("EMPLOYEE", margin, y);
  doc.text("PAY PERIOD", pageW - margin, y, { align: "right" });
  y += 12;
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(line.name, margin, y);
  doc.text(periodLabel, pageW - margin, y, { align: "right" });
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(line.role, margin, y);
  doc.text(`Pay Date: ${new Date().toLocaleDateString()}`, pageW - margin, y, { align: "right" });
  y += 24;

  // Earnings table
  const col1 = margin;
  const col2 = margin + 240;
  const col3 = margin + 320;
  const col4 = pageW - margin;

  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 12;
  const isDaily = line.payMethod === "daily" && (line.dailyRate ?? 0) > 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Earnings", col1, y);
  doc.text(isDaily ? "Shifts" : "Hours", col2, y, { align: "right" });
  doc.text("Rate", col3, y, { align: "right" });
  doc.text("Amount", col4, y, { align: "right" });
  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  const earningRow = (label: string, hrs: string, rate: string, amt: string) => {
    doc.text(label, col1, y);
    doc.text(hrs, col2, y, { align: "right" });
    doc.text(rate, col3, y, { align: "right" });
    doc.text(amt, col4, y, { align: "right" });
    y += 14;
  };
  if (isDaily) {
    const shifts = line.shiftCount ?? 0;
    earningRow(
      "Daily Flat Rate",
      String(shifts),
      `$${fmt(line.dailyRate!)}/shift`,
      `$${fmt(shifts * (line.dailyRate ?? 0))}`,
    );
  } else {
    earningRow("Regular", line.regularHours.toFixed(2), `$${fmt(line.hourlyRate)}/hr`, `$${fmt(line.regularPay)}`);
    if (line.hwPay > 0) {
      earningRow("Health & Welfare", line.regularHours.toFixed(2), `$${fmt(line.hwRate)}/hr`, `$${fmt(line.hwPay)}`);
    }
    if (line.overtimeHours > 0) {
      earningRow(
        "Overtime (1.5x)",
        line.overtimeHours.toFixed(2),
        `$${fmt(line.hourlyRate * 1.5)}/hr`,
        `$${fmt(line.overtimePay)}`,
      );
    }
  }
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageW - margin, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Gross Pay", col1, y);
  doc.text(`$${fmt(line.grossPay)}`, col4, y, { align: "right" });
  y += 22;

  // By incident
  if (line.byIncident.length > 1) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("HOURS BY INCIDENT", margin, y);
    doc.setTextColor(0);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    line.byIncident.forEach((inc) => {
      doc.text(inc.incidentName, col1, y);
      if (isDaily && line.dailyRate) {
        const incShifts = Math.round(inc.grossPay / line.dailyRate);
        doc.text(`${incShifts} ${incShifts === 1 ? "shift" : "shifts"}`, col3, y, { align: "right" });
      } else {
        doc.text(`${inc.totalHours.toFixed(2)} hrs`, col3, y, { align: "right" });
      }
      doc.text(`$${fmt(inc.grossPay)}`, col4, y, { align: "right" });
      y += 12;
    });
    y += 8;
  }

  // Deductions
  const ded = line.deductions;
  if (ded) {
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Deductions", col1, y);
    doc.text("Amount", col4, y, { align: "right" });
    y += 6;
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");

    const dedRow = (label: string, amt: number) => {
      doc.text(label, col1, y);
      doc.text(`-$${fmt(amt)}`, col4, y, { align: "right" });
      y += 14;
    };
    dedRow(`Federal Withholding (${ded.federalPct.toFixed(2)}%)`, ded.federal - ded.extraWithholding);
    if (ded.extraWithholding > 0) dedRow("Extra Federal Withholding", ded.extraWithholding);
    dedRow(`Social Security (${ded.ssPct.toFixed(2)}%)`, ded.socialSecurity);
    dedRow(`Medicare (${ded.medicarePct.toFixed(2)}%)`, ded.medicare);
    if (ded.statePct > 0) dedRow(`State (${ded.statePct.toFixed(2)}%)`, ded.state);
    if (ded.other > 0) dedRow("Other", ded.other);

    doc.setLineWidth(1.5);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Total Deductions", col1, y);
    doc.text(`-$${fmt(ded.total)}`, col4, y, { align: "right" });
    y += 22;
  }

  // Net pay
  doc.setLineWidth(2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NET PAY", col1, y);
  doc.setFontSize(18);
  doc.text(`$${fmt(line.netPay ?? line.grossPay)}`, col4, y, { align: "right" });
  y += 30;

  // Disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120);
  const disclaimer =
    "Estimated Withholding — Not Official Tax Calculation. Generated by FireOps HQ for internal operational use only. Consult a payroll provider for tax filing and compliance.";
  const wrapped = doc.splitTextToSize(disclaimer, pageW - margin * 2);
  doc.text(wrapped, pageW / 2, y, { align: "center" });

  const safeName = line.name.replace(/[^a-z0-9]/gi, "_");
  const safePeriod = periodLabel.replace(/[^a-z0-9]/gi, "_");
  doc.save(`paystub_${safeName}_${safePeriod}.pdf`);
}
