import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ScheduleLineItem } from "@/services/factoring";
import { WIDEQ_SCHEDULE_TEMPLATE_PDF_BASE64 } from "./wideq-schedule-template";

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

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatLongDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMonthDay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function decodeTemplatePdf(): Uint8Array {
  const binary = atob(WIDEQ_SCHEDULE_TEMPLATE_PDF_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function drawFitText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size = 11,
  align: "left" | "center" = "left",
) {
  let drawText = text || "";
  let drawSize = size;
  while (drawSize > 8 && font.widthOfTextAtSize(drawText, drawSize) > maxWidth) {
    drawSize -= 0.25;
  }
  while (drawText.length > 1 && font.widthOfTextAtSize(drawText, drawSize) > maxWidth) {
    drawText = drawText.slice(0, -1);
  }
  if (drawText !== text && drawText.length > 1) {
    drawText = `${drawText.slice(0, -1)}…`;
  }
  const width = font.widthOfTextAtSize(drawText, drawSize);
  const drawX = align === "center" ? x + (maxWidth - width) / 2 : x;
  page.drawText(drawText, {
    x: drawX,
    y,
    size: drawSize,
    font,
    color: rgb(0, 0, 0),
  });
}

export async function buildScheduleOfAccountsPdf(input: ScheduleOfAccountsInput): Promise<Blob> {
  const pdf = await PDFDocument.load(decodeTemplatePdf());
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const total = input.lineItems.reduce((sum, li) => sum + (Number(li.invoice_amount) || 0), 0);
  const reserve = total * ((Number(input.reservePercent) || 0) / 100);
  const scheduleDate = input.scheduleDate instanceof Date ? input.scheduleDate : new Date(input.scheduleDate);
  const agreementDate = toDate(input.agreementDate) ?? scheduleDate;
  const signerTitle = input.signerTitle?.trim() || "Owner";

  // These coordinates fill Anita's original WideQ Word form converted to a Letter PDF.
  // The form itself supplies all boxes, lines, headers, table text, and legal language.
  drawFitText(page, formatLongDate(scheduleDate), 82, 678, 190, font, 11);
  drawFitText(page, String(input.scheduleNumber || ""), 463, 678, 80, font, 11);
  drawFitText(page, input.seller || "", 75, 650, 250, font, 11);

  drawFitText(page, String(input.lineItems.length), 416, 626, 70, font, 11, "center");
  drawFitText(page, fmtUSD(total), 361, 600, 125, font, 11, "center");
  drawFitText(page, fmtUSD(reserve), 320, 574, 165, font, 11, "center");

  drawFitText(page, signerTitle, 227, 335, 115, font, 10.5, "center");
  drawFitText(page, formatMonthDay(agreementDate), 70, 301, 120, bold, 10.5, "center");

  drawFitText(page, ordinal(scheduleDate.getDate()), 323, 158, 55, font, 11, "center");
  drawFitText(page, MONTHS[scheduleDate.getMonth()], 399, 158, 130, font, 11, "center");
  drawFitText(page, scheduleDate.getFullYear().toString().slice(-2), 534, 158, 34, font, 11, "center");

  if (input.signaturePngBlob) {
    try {
      const sigBytes = new Uint8Array(await input.signaturePngBlob.arrayBuffer());
      const sigImg = await pdf.embedPng(sigBytes);
      const maxW = 160;
      const maxH = 30;
      const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height);
      const width = sigImg.width * scale;
      const height = sigImg.height * scale;
      page.drawImage(sigImg, {
        x: 284,
        y: 112,
        width,
        height,
      });
    } catch (error) {
      console.warn("Could not embed signature:", error);
    }
  }

  drawFitText(page, input.signerName || "", 313, 86, 140, font, 11, "center");
  drawFitText(page, signerTitle, 290, 56, 160, font, 11, "center");

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
}
