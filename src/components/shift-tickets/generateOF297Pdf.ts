import { supabase } from "@/integrations/supabase/client";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";

// Dynamically import jspdf to keep bundle small
async function getJsPdf() {
  const { default: jsPDF } = await import("jspdf");
  return jsPDF;
}

function getSignatureStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/signatures/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

async function signatureBlobToDataUrl(blob: Blob): Promise<string | null> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Signature image failed to load"));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const w = image.naturalWidth || image.width || 300;
    const h = image.naturalHeight || image.height || 100;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Draw white background first so transparent areas don't become black in PDF
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Draw the signature on top
    ctx.drawImage(image, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (error) {
    console.warn("Failed to convert signature image:", error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    let blob: Blob | null = null;
    const storagePath = getSignatureStoragePath(url);

    if (storagePath) {
      const { data, error } = await supabase.storage.from("signatures").download(storagePath);
      if (!error && data) {
        blob = data;
      }
    }

    if (!blob) {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        console.warn("Signature fetch failed:", res.status, url);
        return null;
      }
      blob = await res.blob();
    }

    return await signatureBlobToDataUrl(blob);
  } catch (err) {
    console.warn("Failed to load signature image:", err, url);
    return null;
  }
}

export async function generateOF297Pdf(ticket: ShiftTicket): Promise<void> {
  const JsPDF = await getJsPdf();
  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = 612;
  const margin = 36;
  const cw = W - margin * 2;
  let y = margin;

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(x1, y1, x2, y2);
  };

  const text = (str: string, x: number, ty: number, opts?: { size?: number; bold?: boolean; maxWidth?: number }) => {
    doc.setFontSize(opts?.size || 8);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.text(str || "", x, ty, { maxWidth: opts?.maxWidth });
  };

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Emergency Equipment Shift Ticket", W / 2, y + 12, { align: "center" });
  y += 24;
  drawLine(margin, y, W - margin, y);

  // Header fields - 3 columns per row
  const col3 = cw / 3;
  const headerRows = [
    [
      { label: "1. Agreement Number:", value: ticket.agreement_number },
      { label: "2. Contractor/Agency Name:", value: ticket.contractor_name },
      { label: "3. Resource Order Number:", value: ticket.resource_order_number },
    ],
    [
      { label: "4. Incident Name:", value: ticket.incident_name },
      { label: "5. Incident Number:", value: ticket.incident_number },
      { label: "6. Financial Code:", value: ticket.financial_code },
    ],
  ];

  for (const row of headerRows) {
    const rowY = y;
    row.forEach((cell, ci) => {
      const cx = margin + ci * col3;
      text(cell.label, cx + 2, rowY + 10, { size: 7 });
      text(cell.value || "", cx + 2, rowY + 22, { size: 9, bold: true, maxWidth: col3 - 8 });
      drawLine(cx, rowY, cx, rowY + 28);
    });
    drawLine(W - margin, rowY, W - margin, rowY + 28);
    drawLine(margin, rowY + 28, W - margin, rowY + 28);
    y += 28;
  }

  // Row 3 - 4 columns
  const col4 = cw / 4;
  const row3 = [
    { label: "7. Equipment Make/Model:", value: ticket.equipment_make_model },
    { label: "8. Equipment Type:", value: ticket.equipment_type },
    { label: "9. Serial/VIN Number:", value: ticket.serial_vin_number },
    { label: "10. License/ID Number:", value: ticket.license_id_number },
  ];
  const r3y = y;
  row3.forEach((cell, ci) => {
    const cx = margin + ci * col4;
    text(cell.label, cx + 2, r3y + 10, { size: 7 });
    text(cell.value || "", cx + 2, r3y + 22, { size: 9, bold: true, maxWidth: col4 - 8 });
    drawLine(cx, r3y, cx, r3y + 28);
  });
  drawLine(W - margin, r3y, W - margin, r3y + 28);
  drawLine(margin, r3y + 28, W - margin, r3y + 28);
  y += 28;

  // Instructions line
  text("11. Use MILITARY TIME and/or real odometer reading.", margin + 2, y + 10, { size: 7 });
  const trText = ticket.transport_retained ? "Yes" : "No";
  text(`12. Transport Retained? ${trText}`, margin + cw / 2, y + 10, { size: 7 });
  y += 16;
  drawLine(margin, y, W - margin, y);

  // Equipment section header
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, cw, 14, "F");
  drawLine(margin, y, W - margin, y);
  text("Equipment", W / 2 - 20, y + 10, { size: 9, bold: true });
  y += 14;

  // First/Last and Miles row
  const flText = ticket.is_first_last ? `Yes (${ticket.first_last_type || "Mobilization"})` : "No";
  text(`13. First/Last Ticket: ${flText}`, margin + 2, y + 10, { size: 7 });
  text(`14. Miles: ${ticket.miles ?? ""}`, margin + cw / 3, y + 10, { size: 7 });
  y += 16;
  drawLine(margin, y, W - margin, y);

  // Equipment table header
  const eqCols = [60, 55, 55, 45, 50, 55, cw - 320]; // date, start, stop, total, qty, type, remarks
  const eqHeaders = ["15. Date", "16. Start", "17. Stop", "18. Total", "19. Qty", "20. Type", "21. Remarks"];
  let cx = margin;
  for (let i = 0; i < eqHeaders.length; i++) {
    text(eqHeaders[i], cx + 2, y + 10, { size: 7, bold: true });
    drawLine(cx, y, cx, y + 14);
    cx += eqCols[i];
  }
  drawLine(W - margin, y, W - margin, y + 14);
  drawLine(margin, y + 14, W - margin, y + 14);
  y += 14;

  // Equipment rows
  const eqEntries = (ticket.equipment_entries || []) as EquipmentEntry[];
  const eqRowCount = Math.max(eqEntries.length, 5);
  for (let r = 0; r < eqRowCount; r++) {
    const e = eqEntries[r];
    cx = margin;
    const vals = e ? [e.date, e.start, e.stop, e.total?.toString() || "", e.quantity, e.type, e.remarks] : ["", "", "", "", "", "", ""];
    for (let i = 0; i < eqCols.length; i++) {
      text(vals[i] || "", cx + 2, y + 10, { size: 7, maxWidth: eqCols[i] - 4 });
      drawLine(cx, y, cx, y + 14);
      cx += eqCols[i];
    }
    drawLine(W - margin, y, W - margin, y + 14);
    drawLine(margin, y + 14, W - margin, y + 14);
    y += 14;
  }

  // Personnel section
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, cw, 14, "F");
  drawLine(margin, y, W - margin, y);
  text("Personnel", W / 2 - 20, y + 10, { size: 9, bold: true });
  y += 14;

  const pCols = [55, 100, 50, 50, 50, 50, 40, cw - 395];
  const pHeaders = ["22. Date", "23. Operator Name", "24. Start", "25. Stop", "26. Start", "27. Stop", "28. Total", "29. Remarks"];
  cx = margin;
  for (let i = 0; i < pHeaders.length; i++) {
    text(pHeaders[i], cx + 2, y + 10, { size: 6, bold: true });
    drawLine(cx, y, cx, y + 14);
    cx += pCols[i];
  }
  drawLine(W - margin, y, W - margin, y + 14);
  drawLine(margin, y + 14, W - margin, y + 14);
  y += 14;

  const pEntries = (ticket.personnel_entries || []) as PersonnelEntry[];
  const pRowCount = Math.max(pEntries.length, 5);
  for (let r = 0; r < pRowCount; r++) {
    const p = pEntries[r];
    // Build multi-line remarks: line1=activity, line2=lodging or per diem, line3=per diem if lodging
    let remarkLines: string[] = [];
    if (p) {
      if (p.activity_type === "travel") {
        remarkLines.push("Travel/Check-In");
      } else {
        const ctx = p.work_context?.trim();
        remarkLines.push(ctx ? `Work - ${ctx}` : "Work");
      }
      const meals: string[] = [];
      if (p.per_diem_b) meals.push("B");
      if (p.per_diem_l) meals.push("L");
      if (p.per_diem_d) meals.push("D");
      const perDiemStr = meals.length > 0 ? `Per Diem (${meals.join(", ")})` : "";
      if (p.lodging) {
        remarkLines.push("Lodging");
        if (perDiemStr) remarkLines.push(perDiemStr);
      } else if (perDiemStr) {
        remarkLines.push(perDiemStr);
      }
    }

    // Calculate row height based on remark lines
    const rowH = Math.max(14, remarkLines.length * 9 + 4);
    cx = margin;
    const vals = p ? [p.date, p.operator_name, p.op_start, p.op_stop, p.sb_start, p.sb_stop, p.total?.toString() || ""] : ["", "", "", "", "", "", ""];
    for (let i = 0; i < pCols.length - 1; i++) {
      text(vals[i] || "", cx + 2, y + 10, { size: 7, maxWidth: pCols[i] - 4 });
      drawLine(cx, y, cx, y + rowH);
      cx += pCols[i];
    }
    // Remarks column - multi-line
    remarkLines.forEach((line, li) => {
      text(line, cx + 2, y + 9 + li * 9, { size: 6, maxWidth: pCols[pCols.length - 1] - 4 });
    });
    drawLine(cx, y, cx, y + rowH);
    drawLine(W - margin, y, W - margin, y + rowH);
    drawLine(margin, y + rowH, W - margin, y + rowH);
    y += rowH;
  }

  // Remarks
  drawLine(margin, y, W - margin, y);
  text("30. Remarks - Equipment breakdown or operating issues:", margin + 2, y + 10, { size: 7, bold: true });
  y += 14;
  text(ticket.remarks || "", margin + 2, y + 10, { size: 8, maxWidth: cw - 8 });
  y += 36;
  drawLine(margin, y, W - margin, y);

  // Signatures - name and signature ABOVE the line
  const halfW = cw / 2;
  const sigBlockH = 40;

  // Load signatures in parallel
  const [contractorSigData, supervisorSigData] = await Promise.all([
    ticket.contractor_rep_signature_url ? loadImageAsBase64(ticket.contractor_rep_signature_url) : Promise.resolve(null),
    ticket.supervisor_signature_url ? loadImageAsBase64(ticket.supervisor_signature_url) : Promise.resolve(null),
  ]);

  // Contractor - printed name above line
  text(ticket.contractor_rep_name || "", margin + 4, y + sigBlockH - 14, { size: 9, bold: true });
  drawLine(margin, y + sigBlockH, margin + halfW, y + sigBlockH);
  text("31. Contractor/Agency Rep (Printed Name):", margin + 2, y + sigBlockH + 10, { size: 7 });

  // Contractor signature above line
  if (contractorSigData) {
    try { doc.addImage(contractorSigData, "JPEG", margin + halfW + 8, y + sigBlockH - 22, 140, 20); } catch (e) { console.warn("Contractor sig:", e); }
  }
  drawLine(margin + halfW, y + sigBlockH, W - margin, y + sigBlockH);
  text("32. Signature:", margin + halfW + 2, y + sigBlockH + 10, { size: 7 });
  y += sigBlockH + 16;

  // Supervisor - printed name above line
  const supText = `${ticket.supervisor_name || ""} ${ticket.supervisor_resource_order || ""}`.trim();
  text(supText, margin + 4, y + sigBlockH - 14, { size: 9, bold: true });
  drawLine(margin, y + sigBlockH, margin + halfW, y + sigBlockH);
  text("33. Incident Supervisor (Name & RO#):", margin + 2, y + sigBlockH + 10, { size: 7 });

  // Supervisor signature above line
  if (supervisorSigData) {
    try { doc.addImage(supervisorSigData, "JPEG", margin + halfW + 8, y + sigBlockH - 22, 140, 20); } catch (e) { console.warn("Supervisor sig:", e); }
  }
  drawLine(margin + halfW, y + sigBlockH, W - margin, y + sigBlockH);
  text("34. Signature:", margin + halfW + 2, y + sigBlockH + 10, { size: 7 });
  y += sigBlockH + 16;

  // Footer
  y += 16;
  text("OPTIONAL FORM 297 (REV. 5/2024)", W - margin - 2, y, { size: 7 });
  text("USDA/USDI", W - margin - 2, y + 10, { size: 7 });

  // Mobile-friendly download with share fallback
  const fileName = `OF-297-${ticket.incident_name || "ShiftTicket"}-${ticket.id?.slice(0, 8)}.pdf`;
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

  // Try native share (best mobile experience - saves to Files, sends via text/email)
  if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], title: fileName });
      return;
    } catch (shareErr: any) {
      // User cancelled share or share failed — fall through to download
      if (shareErr?.name === "AbortError") return;
    }
  }

  // Fallback: blob URL anchor click
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 500);
}
