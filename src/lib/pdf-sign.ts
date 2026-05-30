import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// Vite worker import
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface BoxRect {
  x: number; // PDF-space, origin bottom-left
  y: number;
  w: number;
  h: number;
}

export interface PageAnchors {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  signatureBox?: BoxRect;
  dateBox?: BoxRect;
  nameBox?: BoxRect;
}

export function getOf286FallbackFields(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
): PageAnchors {
  const formLeft = pageWidth * 0.045;
  const signatureW = pageWidth * 0.32;
  const dateX = pageWidth * 0.37;
  const dateW = pageWidth * 0.145;
  const nameW = pageWidth * 0.48;

  // Standard OF-286 has a footer below the signature block. Keep the fields
  // above the footer, not down at the page edge.
  const nameRowBottom = Math.max(54, pageHeight * 0.115);
  const nameRowH = Math.max(26, pageHeight * 0.055);
  const sigRowBottom = nameRowBottom + nameRowH;
  const sigRowH = Math.max(28, pageHeight * 0.062);

  return {
    pageIndex,
    pageWidth,
    pageHeight,
    signatureBox: {
      x: formLeft + 4,
      y: sigRowBottom + 3,
      w: signatureW - 8,
      h: sigRowH - 6,
    },
    dateBox: {
      x: dateX + 4,
      y: sigRowBottom + 9,
      w: dateW - 8,
      h: 14,
    },
    nameBox: {
      x: formLeft + 4,
      y: nameRowBottom + 7,
      w: nameW - 8,
      h: 14,
    },
  };
}

function withFallbackFields(anchors: PageAnchors): PageAnchors {
  const fallback = getOf286FallbackFields(
    anchors.pageIndex,
    anchors.pageWidth,
    anchors.pageHeight,
  );
  return {
    ...anchors,
    signatureBox: anchors.signatureBox ?? fallback.signatureBox,
    dateBox: anchors.dateBox ?? fallback.dateBox,
    nameBox: anchors.nameBox ?? fallback.nameBox,
  };
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
export async function findOf286Anchors(pdfBytes: Uint8Array): Promise<PageAnchors[]> {
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
    // pdfjs commonly splits "30. CONTRACTOR SIGNATURE" into three runs
    // (["30.", "CONTRACTOR", "SIGNATURE"]), so we slide windows of up to
    // 5 adjacent items.
    const findCompound = (re: RegExp) => {
      const single = findFirst(re);
      if (single) return single;
      for (let win = 2; win <= 5; win++) {
        for (let i = 0; i <= items.length - win; i++) {
          const slice = items.slice(i, i + win);
          // Only merge items that sit on (roughly) the same baseline.
          const baseY = slice[0].y;
          if (slice.some((s) => Math.abs(s.y - baseY) > 3)) continue;
          const merged = slice.map((s) => s.str).join(" ");
          if (re.test(merged)) {
            const last = slice[slice.length - 1];
            return {
              ...slice[0],
              str: merged,
              w: last.x + last.w - slice[0].x,
            };
          }
        }
      }
      return undefined;
    };


    const labelSig = findCompound(/^30\.?\s*CONTRACTOR\s*SIGNATURE/i);
    const labelDate = findCompound(/^31\.?\s*DATE/i);
    const labelRecv = findCompound(/^32\.?\s*RECEIVING\s*OFFICER/i);
    const labelName = findCompound(/^34\.?\s*PRINT\s*NAME/i);
    const labelRecvName = findCompound(/^35\.?\s*PRINT\s*NAME/i);

    const anchors: PageAnchors = {
      pageIndex: p,
      pageWidth: pw,
      pageHeight: ph,
    };

    // pdfjs `y` is the text BASELINE in PDF user-space (origin = bottom-left).
    // The text bbox extends roughly from `y` (baseline) up to `y + h` (cap top)
    // and a small descender below `y`.

    // Find the item directly below #34 (the footer) so we can clamp the name
    // cell. Page items with the smallest y > 0 are the footer line.
    let footerTop = 0;
    if (labelName) {
      for (const it of items) {
        if (it.y < labelName.y - 5 && it.y > footerTop) {
          // Top of footer text = baseline + cap height
          footerTop = it.y + it.h;
        }
      }
    }

    if (labelSig) {
      // Signature cell: from #30 label baseline DOWN to the top of #34's
      // label cell (or a sensible fallback if #34 is missing).
      const right = labelDate ? labelDate.x - 4 : labelSig.x + 200;
      const top = labelSig.y - 2; // just under the "30. CONTRACTOR SIGNATURE" label
      const cellBottom = labelName
        ? labelName.y + labelName.h + 1 // top of #34 label
        : top - 18;
      const x = labelSig.x;
      const w = Math.max(40, right - x);
      const h = Math.max(10, top - cellBottom);
      anchors.signatureBox = { x, y: cellBottom, w, h };
    }

    if (labelDate) {
      // Date sits just below the "31. DATE" label, inside the same cell as
      // the signature row. Baseline ≈ label baseline minus one text line.
      const right = labelRecv ? labelRecv.x - 4 : labelDate.x + 90;
      const baselineY = labelDate.y - labelDate.h - 2;
      anchors.dateBox = {
        x: labelDate.x,
        y: baselineY,
        w: Math.max(30, right - labelDate.x),
        h: labelDate.h,
      };
    }

    if (labelName) {
      // Print name cell: from just under the "34. PRINT NAME AND TITLE"
      // label DOWN to either the page footer or the bottom of the page.
      // Width: from #34 to start of #35 (or #31 column edge).
      const right =
        (labelRecvName?.x ?? labelDate?.x ?? labelName.x + 200) - 4;
      const top = labelName.y - 2;
      const floor = Math.max(footerTop + 4, 6);
      const bottom = Math.max(top - 26, floor);
      anchors.nameBox = {
        x: labelName.x,
        y: bottom,
        w: Math.max(60, right - labelName.x),
        h: Math.max(10, top - bottom),
      };
    }

    results.push(withFallbackFields(anchors));
  }

  return results;
}

export async function getOf286PageAnchorsFromUrl(sourceUrl: string): Promise<PageAnchors[]> {
  const sourceRes = await fetch(sourceUrl);
  if (!sourceRes.ok) throw new Error("Could not download source document");
  const sourceBytes = new Uint8Array(await sourceRes.arrayBuffer());
  const isPdf =
    sourceBytes[0] === 0x25 &&
    sourceBytes[1] === 0x50 &&
    sourceBytes[2] === 0x44 &&
    sourceBytes[3] === 0x46;

  if (!isPdf) {
    return [getOf286FallbackFields(0, 612, 792)];
  }

  try {
    return await findOf286Anchors(sourceBytes);
  } catch (err) {
    console.warn("[pdf-sign] Anchor extraction failed:", err);
    const pdfDoc = await PDFDocument.load(sourceBytes);
    return pdfDoc.getPages().map((page, pageIndex) => {
      const { width, height } = page.getSize();
      return getOf286FallbackFields(pageIndex, width, height);
    });
  }
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
  placements?: Partial<Pick<PageAnchors, "signatureBox" | "dateBox" | "nameBox">>;
}): Promise<Blob> {
  const { sourceUrl, signaturePngBlob, signerName, signedAt, placements } = opts;

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
    const fields = getOf286FallbackFields(0, pw, page.getSize().height);
    const sigBox = placements?.signatureBox ?? fields.signatureBox!;
    const dateBox = placements?.dateBox ?? fields.dateBox!;
    const nameBox = placements?.nameBox ?? fields.nameBox!;
    const sigW = Math.min(sigBox.w, sigBox.h * (sigImage.width / sigImage.height));
    const sigH = sigW * (sigImage.height / sigImage.width);
    page.drawImage(sigImage, {
      x: sigBox.x,
      y: sigBox.y,
      width: sigW,
      height: sigH,
    });
    page.drawText(dateStr, {
      x: dateBox.x,
      y: dateBox.y,
      size: 9,
      font: helv,
    });
    page.drawText(signerName, {
      x: nameBox.x,
      y: nameBox.y,
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

  // Fit signature into the cell, anchored to the bottom-left so it sits
  // on the signature line rather than floating in the middle of the cell.
  const fitImage = (box: BoxRect) => {
    const aspect = sigImage.width / sigImage.height;
    // Leave a little breathing room inside the cell.
    const maxW = Math.max(20, box.w - 6);
    const maxH = Math.max(10, box.h - 4);
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return {
      x: box.x + 3,
      y: box.y + 2,
      w,
      h,
    };
  };

  // Layout-based fallback for OF-286 pages that have no text layer (scanned /
  // image-only PDFs). The signature block on a standard OF-286 sits at the
  // very bottom of every page in this arrangement (fractions of page width):
  //   [ 30. CONTRACTOR SIG  | 31. DATE | 32. RECEIVING OFFICER | 33. DATE ]
  //   [ 34. PRINT NAME & TITLE        | 35. PRINT NAME & TITLE          ]
  // Cell 30 occupies roughly the left ~28% of the page width; cell 31 the
  // next ~13%. The two-row block sits in the bottom ~9% of the page.
  const stampContractorBlockFallback = (page: any) => {
    const { width: pw, height: ph } = page.getSize();
    // Bottom of cell-34 row (printed name) and bottom of cell-30 row (sig).
    const nameRowBottom = Math.max(20, ph * 0.025);
    const sigRowBottom = nameRowBottom + Math.max(14, ph * 0.022);
    const rowHeight = Math.max(12, ph * 0.022);

    // Signature inside cell 30
    const sigBox: BoxRect = {
      x: pw * 0.025,
      y: sigRowBottom,
      w: pw * 0.26,
      h: rowHeight,
    };
    const fit = fitImage(sigBox);
    page.drawImage(sigImage, { x: fit.x, y: fit.y, width: fit.w, height: fit.h });

    // Date inside cell 31 (just to the right of the signature)
    page.drawText(dateStr, {
      x: pw * 0.30,
      y: sigRowBottom + 3,
      size: 9,
      font: helv,
      color: rgb(0, 0, 0),
    });

    // Printed name inside cell 34
    page.drawText(signerName, {
      x: pw * 0.025 + 3,
      y: nameRowBottom + 3,
      size: 9,
      font: helv,
      color: rgb(0, 0, 0),
    });
  };

  let stampedAny = false;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const anchors = anchorsList[i];

    if (anchors?.signatureBox || anchors?.nameBox) {
      if (anchors?.signatureBox) {
        const fit = fitImage(anchors.signatureBox);
        page.drawImage(sigImage, { x: fit.x, y: fit.y, width: fit.w, height: fit.h });
      }
      if (anchors?.dateBox) {
        page.drawText(dateStr, {
          x: anchors.dateBox.x + 2,
          y: anchors.dateBox.y + 2,
          size: 9,
          font: helv,
          color: rgb(0, 0, 0),
        });
      }
      if (anchors?.nameBox) {
        page.drawText(signerName, {
          x: anchors.nameBox.x + 3,
          y: anchors.nameBox.y + 3,
          size: 9,
          font: helv,
          color: rgb(0, 0, 0),
        });
      }
      stampedAny = true;
    } else {
      // No text-layer anchors on this page — use layout fallback so the
      // signature still lands in the CONTRACTOR cells (30/31/34), not the
      // officer cells (32/33/35), and stamps EVERY page (not just the last).
      stampContractorBlockFallback(page);
      stampedAny = true;
    }
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
