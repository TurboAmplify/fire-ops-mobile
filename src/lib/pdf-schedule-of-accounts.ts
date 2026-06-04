import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ScheduleLineItem } from "@/services/factoring";

export interface ScheduleOfAccountsInput {
  factorCompanyName: string;
  scheduleDate: Date;
  scheduleNumber: number;
  seller: string;
  signerName: string;
  signerTitle: string;
  agreementDate: string | null;
  reservePercent: number;
  lineItems: ScheduleLineItem[];
  signaturePngBlob?: Blob | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso || "";
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

// --- text wrapping helper ---
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildScheduleOfAccountsPdf(input: ScheduleOfAccountsInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  // Serif fonts to match the WideQ template look
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifBoldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const page: PDFPage = pdf.addPage([612, 792]); // US Letter
  const { width: pw, height: ph } = page.getSize();
  const margin = 54;
  let y = ph - margin;

  const black = rgb(0, 0, 0);

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts?: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> },
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      size: opts?.size ?? 11,
      font: opts?.font ?? serif,
      color: opts?.color ?? black,
    });
  };

  const drawTextCentered = (
    text: string,
    cx: number,
    yPos: number,
    font: PDFFont,
    size: number,
  ) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y: yPos, size, font, color: black });
  };

  const drawUnderline = (x: number, yPos: number, w: number, thickness = 0.6) => {
    page.drawLine({
      start: { x, y: yPos - 2 },
      end: { x: x + w, y: yPos - 2 },
      thickness,
      color: black,
    });
  };

  // ---------------- Header ----------------
  // "WideQ Financial LLC" — centered, bold italic serif, large
  const titleSize = 20;
  drawTextCentered(input.factorCompanyName, pw / 2, y - titleSize, serifBoldItalic, titleSize);
  y -= titleSize + 14;

  // "SCHEDULE OF ACCOUNTS" — centered, bold, underlined
  const subSize = 16;
  const subText = "SCHEDULE OF ACCOUNTS";
  const subW = serifBold.widthOfTextAtSize(subText, subSize);
  drawTextCentered(subText, pw / 2, y - subSize, serifBold, subSize);
  drawUnderline(pw / 2 - subW / 2, y - subSize, subW, 0.9);
  y -= subSize + 26;

  // ---------------- DATE / SCHEDULE NO. row ----------------
  const labelSize = 11;
  const fillSize = 11;

  // DATE: on left
  const dateLabel = "DATE:";
  const dateValue = input.scheduleDate.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  drawText(dateLabel, margin, y, { font: serif, size: labelSize });
  const dateLabelW = serif.widthOfTextAtSize(dateLabel, labelSize);
  const dateFillX = margin + dateLabelW + 6;
  const dateFillW = 200;
  drawText(dateValue, dateFillX + 4, y, { font: serif, size: fillSize });
  drawUnderline(dateFillX, y, dateFillW);

  // SCHEDULE NO. on right
  const schedLabel = "SCHEDULE NO.";
  const schedValue = String(input.scheduleNumber);
  const schedFillW = 140;
  const schedLabelW = serif.widthOfTextAtSize(schedLabel, labelSize);
  const schedRightX = pw - margin;
  const schedFillX = schedRightX - schedFillW;
  const schedLabelX = schedFillX - schedLabelW - 6;
  drawText(schedLabel, schedLabelX, y, { font: serif, size: labelSize });
  drawText(schedValue, schedFillX + 4, y, { font: serif, size: fillSize });
  drawUnderline(schedFillX, y, schedFillW);
  y -= 28;

  // ---------------- SELLER + Totals box ----------------
  const sellerLabel = "SELLER:";
  const sellerLabelW = serif.widthOfTextAtSize(sellerLabel, labelSize);
  drawText(sellerLabel, margin, y, { font: serif, size: labelSize });
  drawUnderline(margin, y, sellerLabelW);
  const sellerFillX = margin + sellerLabelW + 6;
  const sellerFillW = 240;
  drawText(input.seller || "", sellerFillX + 4, y, { font: serif, size: fillSize });
  drawUnderline(sellerFillX, y, sellerFillW);

  // Totals box on the right
  const total = input.lineItems.reduce((s, li) => s + (Number(li.invoice_amount) || 0), 0);
  const reserve = total * (input.reservePercent / 100);

  const boxW = 270;
  const boxX = pw - margin - boxW;
  const boxRows = [
    { label: "Total Number of Accounts Sold:", value: String(input.lineItems.length) },
    { label: "Total Amount Sold:", value: fmtUSD(total) },
    { label: "Reserve:", value: fmtUSD(reserve) },
  ];
  const boxPadX = 12;
  const boxPadY = 12;
  const boxRowH = 22;
  const boxH = boxPadY * 2 + boxRowH * boxRows.length;
  const boxTopY = y + 8;
  page.drawRectangle({
    x: boxX,
    y: boxTopY - boxH,
    width: boxW,
    height: boxH,
    borderColor: black,
    borderWidth: 0.8,
  });
  let boxRowY = boxTopY - boxPadY - 10;
  for (const r of boxRows) {
    drawText(r.label, boxX + boxPadX, boxRowY, { font: serif, size: 11 });
    const labW = serif.widthOfTextAtSize(r.label, 11);
    const valX = boxX + boxPadX + labW + 6;
    const valW = boxX + boxW - boxPadX - valX;
    drawText(r.value, valX + 4, boxRowY, { font: serif, size: 11 });
    drawUnderline(valX, boxRowY, valW);
    boxRowY -= boxRowH;
  }
  // advance below the taller of (seller row, box)
  y = Math.min(y - 14, boxTopY - boxH - 22);

  // ---------------- Accounts table ----------------
  const tableX = margin;
  const tableW = pw - margin * 2;
  // Column widths roughly: 28% / 26% / 23% / 23%
  const colWs = [tableW * 0.28, tableW * 0.26, tableW * 0.23, tableW * 0.23];
  const colCenters = colWs.map((w, i) => {
    let x = tableX;
    for (let j = 0; j < i; j++) x += colWs[j];
    return x + w / 2;
  });

  // Column headers (centered, two lines, underlined per word)
  const headerLines: [string, string][] = [
    ["ACCOUNT", "DEBTOR"],
    ["INVOICE", "NUMBER"],
    ["INVOICE", "AMOUNT"],
    ["INVOICE", "DATE"],
  ];
  const headerSize = 13;
  const headerLine1Y = y;
  const headerLine2Y = y - (headerSize + 2);
  for (let i = 0; i < headerLines.length; i++) {
    const [l1, l2] = headerLines[i];
    drawTextCentered(l1, colCenters[i], headerLine1Y, serifBold, headerSize);
    drawTextCentered(l2, colCenters[i], headerLine2Y, serifBold, headerSize);
    const l2W = serifBold.widthOfTextAtSize(l2, headerSize);
    drawUnderline(colCenters[i] - l2W / 2, headerLine2Y, l2W, 0.8);
  }
  y = headerLine2Y - 22;

  // Data rows
  const rows = input.lineItems.length > 0
    ? input.lineItems
    : [{ document_id: "", account_debtor: "See attached listing of Accounts", invoice_number: "", invoice_amount: 0, invoice_date: "" } as ScheduleLineItem];

  const rowH = 28;
  // Ensure at least 3 visible rows for a balanced look (like the template)
  const renderedRows = rows.length >= 3 ? rows : [
    ...rows,
    ...Array.from({ length: 3 - rows.length }, () => ({
      document_id: "", account_debtor: "", invoice_number: "", invoice_amount: 0, invoice_date: "",
    } as ScheduleLineItem)),
  ];

  // outer table border
  const tableTopY = y;
  const tableHeight = rowH * renderedRows.length;
  page.drawRectangle({
    x: tableX,
    y: tableTopY - tableHeight,
    width: tableW,
    height: tableHeight,
    borderColor: black,
    borderWidth: 0.8,
  });
  // vertical dividers
  let cx = tableX;
  for (let i = 0; i < colWs.length - 1; i++) {
    cx += colWs[i];
    page.drawLine({
      start: { x: cx, y: tableTopY },
      end: { x: cx, y: tableTopY - tableHeight },
      thickness: 0.6,
      color: black,
    });
  }
  // horizontal row dividers + cell text
  for (let r = 0; r < renderedRows.length; r++) {
    const rowTop = tableTopY - rowH * r;
    if (r > 0) {
      page.drawLine({
        start: { x: tableX, y: rowTop },
        end: { x: tableX + tableW, y: rowTop },
        thickness: 0.6,
        color: black,
      });
    }
    const li = renderedRows[r];
    const cells = [
      li.account_debtor || "",
      li.invoice_number || "",
      li.invoice_amount ? fmtUSD(Number(li.invoice_amount)) : "",
      fmtShortDate(li.invoice_date),
    ];
    let cellX = tableX;
    const cellTextY = rowTop - rowH / 2 - 4;
    for (let i = 0; i < cells.length; i++) {
      const isPlaceholder =
        cells[i] === "See attached listing of Accounts";
      const font = isPlaceholder ? serifBold : serif;
      const size = 10.5;
      // simple truncation with ellipsis
      let text = cells[i];
      const maxW = colWs[i] - 12;
      while (font.widthOfTextAtSize(text, size) > maxW && text.length > 1) {
        text = text.slice(0, -1);
      }
      if (text !== cells[i] && text.length > 1) text = text.slice(0, -1) + "…";
      const tW = font.widthOfTextAtSize(text, size);
      drawText(text, cellX + (colWs[i] - tW) / 2, cellTextY, { font, size });
      cellX += colWs[i];
    }
  }
  y = tableTopY - tableHeight - 28;

  // ---------------- Certification ----------------
  const certIntro =
    "The undersigned does hereby certify that he or she has made a thorough inquiry into all matters certified herein and, based upon such inquiry and experience does hereby certify that:";
  const certSize = 10.5;
  const certWidth = pw - margin * 2;
  for (const line of wrapText(certIntro, serif, certSize, certWidth)) {
    drawText(line, margin, y, { font: serif, size: certSize });
    y -= 13;
  }
  y -= 8;

  const agreementDateStr = input.agreementDate
    ? new Date(input.agreementDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "______________________________";

  const numbered: string[] = [
    `He or she is the duly elected, qualified, and acting ${input.signerTitle || "Owner"} of Seller.`,
    `This Schedule of Accounts is being submitted to ${input.factorCompanyName} (\u201CPurchaser\u201D) pursuant to that certain Factoring and Security Agreement dated as of ${agreementDateStr}, between Seller and Purchaser (as amended, modified, supplemented or restated and in effect from time to time, the \u201CAgreement\u201D).`,
    "All representations and warranties made by Seller in the Agreement or any other instrument, document, certificate or other agreement executed in connection therewith (collectively, the \u201CTransaction Documents\u201D) delivered on or before the date hereof are true on and as of the date hereof as if such representations and warranties had been made as of the date hereof.",
    "No Event of Default (as defined in the Agreement) or any event that, with the giving of notice, the passage of time or both, would constitute an Event of Default exists on the date hereof.",
    "Seller has performed and complied with all agreements and conditions required in the Transaction Documents to be performed or complied with by it on or prior to the date hereof.",
    "All information contained in this Schedule of Accounts is true, correct and complete.",
  ];

  const numberIndent = 26;
  for (let i = 0; i < numbered.length; i++) {
    const label = `${i + 1}.)`;
    drawText(label, margin, y, { font: serif, size: certSize });
    const lines = wrapText(numbered[i], serif, certSize, certWidth - numberIndent);
    for (let j = 0; j < lines.length; j++) {
      drawText(lines[j], margin + numberIndent, y, { font: serif, size: certSize });
      y -= 13;
    }
    y -= 6;
  }

  y -= 8;

  // IN WITNESS WHEREOF line
  const today = input.scheduleDate;
  const dayStr = ordinal(today.getDate());
  const monthStr = MONTHS[today.getMonth()];
  const yearShort = today.getFullYear().toString().slice(-2);
  const witness = `IN WITNESS WHEREOF, this instrument is executed by the undersigned as of the ${dayStr} day of ${monthStr}, 20${yearShort}.`;
  for (const line of wrapText(witness, serif, certSize, certWidth)) {
    drawText(line, margin, y, { font: serif, size: certSize });
    y -= 13;
  }

  // ---------------- Signature block (centered, like template) ----------------
  y -= 30;
  const sigBlockX = pw / 2 - 40; // labels start a bit left of center
  const sigLineW = 240;
  const sigLineX = sigBlockX + 60;

  // By:
  drawText("By:", sigBlockX, y, { font: serif, size: 11 });
  drawUnderline(sigLineX, y, sigLineW);
  if (input.signaturePngBlob) {
    try {
      const sigBytes = new Uint8Array(await input.signaturePngBlob.arrayBuffer());
      const sigImg = await pdf.embedPng(sigBytes);
      const maxH = 26;
      const aspect = sigImg.width / sigImg.height;
      const h = maxH;
      const w = Math.min(sigLineW - 8, h * aspect);
      page.drawImage(sigImg, {
        x: sigLineX + 4,
        y: y + 1,
        width: w,
        height: h,
      });
    } catch (e) {
      console.warn("Could not embed signature:", e);
    }
  }
  y -= 36;

  // Print Name:
  drawText("Print Name:", sigBlockX, y, { font: serif, size: 11 });
  drawUnderline(sigLineX, y, sigLineW);
  drawText(input.signerName || "", sigLineX + 4, y, { font: serif, size: 11 });
  y -= 30;

  // Title:
  drawText("Title:", sigBlockX, y, { font: serif, size: 11 });
  drawUnderline(sigLineX, y, sigLineW);
  drawText(input.signerTitle || "Owner", sigLineX + 4, y, { font: serif, size: 11 });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
}
