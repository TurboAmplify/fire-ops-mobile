import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

export async function buildScheduleOfAccountsPdf(input: ScheduleOfAccountsInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]); // US Letter
  const { width: pw, height: ph } = page.getSize();
  const margin = 54;
  let y = ph - margin;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts?: { font?: any; size?: number; color?: ReturnType<typeof rgb> },
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      size: opts?.size ?? 10,
      font: opts?.font ?? helv,
      color: opts?.color ?? rgb(0, 0, 0),
    });
  };

  // ----- Header -----
  drawText(input.factorCompanyName, margin, y, { font: helvBold, size: 16 });
  y -= 22;
  drawText("SCHEDULE OF ACCOUNTS", margin, y, { font: helvBold, size: 13 });
  page.drawLine({
    start: { x: margin, y: y - 2 },
    end: { x: margin + helvBold.widthOfTextAtSize("SCHEDULE OF ACCOUNTS", 13), y: y - 2 },
    thickness: 0.5,
  });
  y -= 24;

  const scheduleDateStr = input.scheduleDate.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  drawText(`DATE: ${scheduleDateStr}`, margin, y, { font: helvBold });
  drawText(`SCHEDULE NO. ${input.scheduleNumber}`, pw - margin - 160, y, { font: helvBold });
  y -= 20;

  drawText("SELLER:", margin, y, { font: helvBold });
  drawText(input.seller || "—", margin + 50, y);
  y -= 22;

  // ----- Totals -----
  const total = input.lineItems.reduce((s, li) => s + (Number(li.invoice_amount) || 0), 0);
  const reserve = total * (input.reservePercent / 100);

  drawText(`Total Number of Accounts Sold: ${input.lineItems.length}`, margin, y); y -= 14;
  drawText(`Total Amount Sold: ${fmtUSD(total)}`, margin, y); y -= 14;
  drawText(
    `Reserve (${input.reservePercent.toFixed(2)}%): ${fmtUSD(reserve)}`,
    margin, y,
  );
  y -= 22;

  // ----- Table -----
  const tableX = margin;
  const tableW = pw - margin * 2;
  const colWs = [tableW * 0.32, tableW * 0.22, tableW * 0.21, tableW * 0.25];
  const colHeaders = ["ACCOUNT DEBTOR", "INVOICE NUMBER", "INVOICE AMOUNT", "INVOICE DATE"];
  const rowH = 22;

  // Header row
  page.drawRectangle({
    x: tableX, y: y - rowH, width: tableW, height: rowH,
    color: rgb(0.93, 0.93, 0.93),
    borderColor: rgb(0, 0, 0), borderWidth: 0.5,
  });
  let cx = tableX;
  for (let i = 0; i < colHeaders.length; i++) {
    drawText(colHeaders[i], cx + 4, y - rowH + 7, { font: helvBold, size: 9 });
    cx += colWs[i];
  }
  y -= rowH;

  // Data rows (paginate if needed)
  const ensureSpace = (need: number) => {
    if (y - need < margin + 200) {
      page = pdf.addPage([612, 792]);
      y = ph - margin;
    }
  };

  const rows = input.lineItems.length > 0
    ? input.lineItems
    : [{ document_id: "", account_debtor: "See attached listing of Accounts", invoice_number: "", invoice_amount: 0, invoice_date: "" } as ScheduleLineItem];

  for (const li of rows) {
    ensureSpace(rowH + 4);
    page.drawRectangle({
      x: tableX, y: y - rowH, width: tableW, height: rowH,
      borderColor: rgb(0, 0, 0), borderWidth: 0.5,
    });
    cx = tableX;
    const cells = [
      li.account_debtor || "",
      li.invoice_number || "",
      li.invoice_amount ? fmtUSD(Number(li.invoice_amount)) : "",
      fmtShortDate(li.invoice_date),
    ];
    for (let i = 0; i < cells.length; i++) {
      // crude truncation
      const maxChars = Math.max(8, Math.floor(colWs[i] / 5.2));
      const t = cells[i].length > maxChars ? cells[i].slice(0, maxChars - 1) + "…" : cells[i];
      drawText(t, cx + 4, y - rowH + 7, { size: 9 });
      cx += colWs[i];
    }
    y -= rowH;
  }

  y -= 18;
  ensureSpace(260);

  // ----- Certifications -----
  const agreementDateStr = input.agreementDate
    ? new Date(input.agreementDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "____________";
  const today = input.scheduleDate;
  const dayStr = ordinal(today.getDate());
  const monthStr = MONTHS[today.getMonth()];
  const yearShort = today.getFullYear().toString().slice(-2);

  const cert = [
    "The undersigned does hereby certify that he or she has made a thorough inquiry into all matters",
    "certified herein and, based upon such inquiry and experience does hereby certify that:",
    "",
    `1.) He or she is the duly elected, qualified, and acting ${input.signerTitle || "Owner"} of Seller.`,
    "",
    `2.) This Schedule of Accounts is being submitted to ${input.factorCompanyName} ("Purchaser")`,
    `pursuant to that certain Factoring and Security Agreement dated as of ${agreementDateStr},`,
    "between Seller and Purchaser (as amended, modified, supplemented or restated and in effect from",
    "time to time, the \"Agreement\").",
    "",
    "3.) All representations and warranties made by Seller in the Agreement or any other instrument,",
    "document, certificate or other agreement executed in connection therewith (collectively, the",
    "\"Transaction Documents\") delivered on or before the date hereof are true on and as of the date",
    "hereof as if such representations and warranties had been made as of the date hereof.",
    "",
    "4.) No Event of Default (as defined in the Agreement) or any event that, with the giving of notice,",
    "the passage of time or both, would constitute an Event of Default exists on the date hereof.",
    "",
    "5.) Seller has performed and complied with all agreements and conditions required in the",
    "Transaction Documents to be performed or complied with by it on or prior to the date hereof.",
    "",
    "6.) All information contained in this Schedule of Accounts is true, correct and complete.",
  ];
  for (const line of cert) {
    ensureSpace(13);
    if (line) drawText(line, margin, y, { size: 9.5 });
    y -= 13;
  }

  y -= 18;
  ensureSpace(140);
  drawText(
    `IN WITNESS WHEREOF, this instrument is executed by the undersigned as of the ${dayStr} day of ${monthStr}, 20${yearShort}.`,
    margin, y, { size: 9.5 },
  );
  y -= 40;

  // Signature line
  drawText("By:", margin, y, { font: helvBold });
  const lineX = margin + 28;
  const lineW = 260;
  page.drawLine({
    start: { x: lineX, y: y - 2 },
    end: { x: lineX + lineW, y: y - 2 },
    thickness: 0.6,
  });

  // Stamp signature image if provided
  if (input.signaturePngBlob) {
    try {
      const sigBytes = new Uint8Array(await input.signaturePngBlob.arrayBuffer());
      const sigImg = await pdf.embedPng(sigBytes);
      const maxH = 28;
      const aspect = sigImg.width / sigImg.height;
      const h = maxH;
      const w = Math.min(lineW - 8, h * aspect);
      page.drawImage(sigImg, {
        x: lineX + 4,
        y: y + 1,
        width: w,
        height: h,
      });
    } catch (e) {
      console.warn("Could not embed signature:", e);
    }
  }

  y -= 26;
  drawText("Print Name:", margin, y, { font: helvBold });
  drawText(input.signerName || "", margin + 78, y);
  page.drawLine({
    start: { x: margin + 76, y: y - 2 },
    end: { x: margin + 76 + 280, y: y - 2 },
    thickness: 0.4,
  });
  y -= 22;
  drawText("Title:", margin, y, { font: helvBold });
  drawText(input.signerTitle || "Owner", margin + 78, y);
  page.drawLine({
    start: { x: margin + 76, y: y - 2 },
    end: { x: margin + 76 + 280, y: y - 2 },
    thickness: 0.4,
  });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
}
