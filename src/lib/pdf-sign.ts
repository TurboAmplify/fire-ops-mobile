import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// Vite worker import
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface BoxRect {
  x: number; // PDF-space, origin bottom-left
  y: number;
  w: number;
  h: number;
}

interface PageAnchors {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  signatureBox?: BoxRect;
  dateBox?: BoxRect;
  nameBox?: BoxRect;
}

/**
 * Scan every page of the PDF for the OF-286 signature row labels and return
 * the rectangles where we should stamp the signature, date, and printed name.
 *
 * The OF-286 layout always contains four labels arranged horizontally:
 *   "30. CONTRACTOR SIGNATURE" | "31. DATE" | "32. RECEIVING OFFICER..." | "33. DATE"
 * with "34. PRINT NAME AND TITLE" directly below #30.
 *
 * We anchor to those text labels (case-insensitive) so the placement adapts to
 * any agency variant of the form, regardless of margins or scaling.
 */
async function findOf286Anchors(pdfBytes: Uint8Array): Promise<PageAnchors[]> {
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const results: PageAnchors[] = [];

  for (let p = 0; p < doc.numPages; p++) {
    const page = await doc.getPage(p + 1);
    const viewport = page.getViewport({ scale: 1 });
    const pw = viewport.width;
    const ph = viewport.height;
    const textContent = await page.getTextContent();

    // Each item has transform [a,b,c,d,e,f] where (e,f) is the position in
    // PDF user-space (origin bottom-left). `str` is the text.
    type Item = { str: string; x: number; y: number; w: number; h: number };
    const items: Item[] = [];
    for (const it of textContent.items as any[]) {
      const t = it.transform;
      const x = t[4];
      const y = t[5];
      const h = it.height ?? Math.abs(t[3]) ?? 10;
      const w = it.width ?? 0;
      const s = String(it.str ?? "").trim();
      if (s) items.push({ str: s, x, y, w, h });
    }

    const findFirst = (re: RegExp) => items.find((i) => re.test(i.str));

    // Concatenate adjacent items so multi-fragment labels still match.
    const findCompound = (re: RegExp) => {
      // try single
      const single = findFirst(re);
      if (single) return single;
      // try pairs (rare for OF-286 but cheap)
      for (let i = 0; i < items.length - 1; i++) {
        const merged = `${items[i].str} ${items[i + 1].str}`;
        if (re.test(merged)) {
          return {
            ...items[i],
            str: merged,
            w: (items[i + 1].x + items[i + 1].w) - items[i].x,
          };
        }
      }
      return undefined;
    };

    const labelSig = findCompound(/^30\.?\s*CONTRACTOR\s*SIGNATURE/i);
    const labelDate = findCompound(/^31\.?\s*DATE/i);
    const labelRecv = findCompound(/^32\.?\s*RECEIVING\s*OFFICER/i);
    const labelName = findCompound(/^34\.?\s*PRINT\s*NAME/i);

    const anchors: PageAnchors = {
      pageIndex: p,
      pageWidth: pw,
      pageHeight: ph,
    };

    if (labelSig) {
      // Signature cell: starts at #30 label x, ends at #31 label x.
      // Vertically: from the row baseline below the label down to where #34 starts.
      const right = labelDate ? labelDate.x : pw * 0.36;
      const top = labelSig.y - 2; // just below the label baseline
      const bottom = labelName ? labelName.y + labelName.h + 2 : top - 30;
      const x = labelSig.x;
      const y = bottom;
      const w = Math.max(40, right - x - 6);
      const h = Math.max(14, top - bottom - 2);
      anchors.signatureBox = { x, y, w, h };
    }

    if (labelDate) {
      // Date cell: between #31 and #32 labels, baseline a bit below the label.
      const right = labelRecv ? labelRecv.x : labelDate.x + 90;
      const x = labelDate.x;
      const w = Math.max(30, right - x - 6);
      const baselineY = labelDate.y - labelDate.h - 4;
      anchors.dateBox = { x, y: baselineY, w, h: labelDate.h + 2 };
    }

    if (labelName) {
      // Print name cell sits below #34 label.
      const right = labelDate
        ? labelDate.x
        : labelSig
          ? labelSig.x + 200
          : pw * 0.5;
      const x = labelName.x;
      const top = labelName.y - 2;
      const bottom = Math.max(top - 24, 8);
      anchors.nameBox = {
        x,
        y: bottom + 2,
        w: Math.max(60, right - x - 6),
        h: top - bottom,
      };
    }

    results.push(anchors);
  }

  return results;
}

/**
 * Stamp a signature image, date, and printed name onto every page of an OF-286
 * PDF in the contractor signature region (Block 30 / 31 / 34).
 *
 * Uses pdfjs to find the actual label positions in the PDF text layer, so
 * placement adapts to any agency variant of the form.
 *
 * Falls back to a single bottom-right stamp on the last page for non-OF-286
 * sources (e.g. plain image scans we converted to PDF, or PDFs without a text
 * layer).
 */
export async function stampSignatureOntoPdf(opts: {
  sourceUrl: string;
  signaturePngBlob: Blob;
  signerName: string;
  signedAt: Date;
}): Promise<Blob> {
  const { sourceUrl, signaturePngBlob, signerName, signedAt } = opts;

  const sourceRes = await fetch(sourceUrl);
  if (!sourceRes.ok) throw new Error("Could not download source document");
  const sourceBytes = new Uint8Array(await sourceRes.arrayBuffer());
  const sigBytes = new Uint8Array(await signaturePngBlob.arrayBuffer());

  const isPdf =
    sourceBytes[0] === 0x25 &&
    sourceBytes[1] === 0x50 &&
    sourceBytes[2] === 0x44 &&
    sourceBytes[3] === 0x46;

  let pdfDoc: PDFDocument;
  let isImageFallback = false;
  if (isPdf) {
    pdfDoc = await PDFDocument.load(sourceBytes);
  } else {
    isImageFallback = true;
    pdfDoc = await PDFDocument.create();
    let img;
    try {
      img = await pdfDoc.embedPng(sourceBytes);
    } catch {
      img = await pdfDoc.embedJpg(sourceBytes);
    }
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const sigImage = await pdfDoc.embedPng(sigBytes);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const dateStr = signedAt.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const pages = pdfDoc.getPages();

  if (isImageFallback) {
    const page = pages[0];
    const { width: pw } = page.getSize();
    const sigW = Math.min(220, pw * 0.32);
    const sigH = sigW * (sigImage.height / sigImage.width);
    page.drawImage(sigImage, {
      x: pw - sigW - 24,
      y: 38 + 14,
      width: sigW,
      height: sigH,
    });
    page.drawText(`${signerName}  •  ${signedAt.toLocaleString()}`, {
      x: pw - sigW - 24,
      y: 38,
      size: 8,
      font: helv,
    });
    const out = await pdfDoc.save();
    return new Blob([out.slice().buffer as ArrayBuffer], { type: "application/pdf" });
  }

  // Find anchors via pdfjs. If extraction fails (image-only PDF), fall back
  // to the bottom-right stamp on each page.
  let anchorsList: PageAnchors[] = [];
  try {
    anchorsList = await findOf286Anchors(sourceBytes);
  } catch (err) {
    console.warn("[pdf-sign] Anchor extraction failed:", err);
  }

  const fitImage = (box: BoxRect) => {
    const aspect = sigImage.width / sigImage.height;
    let w = box.w;
    let h = w / aspect;
    if (h > box.h) {
      h = box.h;
      w = h * aspect;
    }
    return {
      x: box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
      w,
      h,
    };
  };

  let stampedAny = false;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const anchors = anchorsList[i];

    // Skip pages that don't have an OF-286 signature row (e.g. addendum
    // pages like the Deductions/Additions sheet).
    if (!anchors?.signatureBox && !anchors?.nameBox) continue;

    if (anchors?.signatureBox) {
      const fit = fitImage(anchors.signatureBox);
      page.drawImage(sigImage, { x: fit.x, y: fit.y, width: fit.w, height: fit.h });
    }

    if (anchors?.dateBox) {
      page.drawText(dateStr, {
        x: anchors.dateBox.x + 2,
        y: anchors.dateBox.y + 2,
        size: 10,
        font: helv,
        color: rgb(0, 0, 0),
      });
    }

    if (anchors?.nameBox) {
      page.drawText(signerName, {
        x: anchors.nameBox.x + 2,
        y: anchors.nameBox.y + Math.max(2, anchors.nameBox.h * 0.25),
        size: 9,
        font: helv,
        color: rgb(0, 0, 0),
      });
    }

    stampedAny = true;
  }

  // If anchor extraction failed across the board (e.g. scanned image PDF
  // with no text layer), fall back to stamping the last page bottom-right
  // so the signature still ends up *somewhere* visible.
  if (!stampedAny) {
    const page = pages[pages.length - 1];
    const { width: pw } = page.getSize();
    const sigW = Math.min(180, pw * 0.28);
    const sigH = sigW * (sigImage.height / sigImage.width);
    page.drawImage(sigImage, {
      x: pw - sigW - 30,
      y: 60,
      width: sigW,
      height: sigH,
    });
    page.drawText(`${signerName}  •  ${dateStr}`, {
      x: pw - sigW - 30,
      y: 48,
      size: 9,
      font: helv,
    });
  }

  const out = await pdfDoc.save();
  return new Blob([out.slice().buffer as ArrayBuffer], { type: "application/pdf" });
}

export async function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
