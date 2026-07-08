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
  // Standard OF-286 contractor signing block sits just above the printed
  // footer. These fractions come from the actual grid lines, not from the
  // remarks/payment rows above it:
  //   [30. CONTRACTOR SIGNATURE | 31. DATE | 32... | 33...]
  //   [34. PRINT NAME AND TITLE | 35...]
  const formLeft = pageWidth * 0.033;
  const dateX = pageWidth * 0.346;
  const officerX = pageWidth * 0.496;
  const signatureW = dateX - formLeft;
  const dateW = officerX - dateX;
  const nameW = officerX - formLeft;

  const nameRowBottom = Math.max(28, pageHeight * 0.05);
  const nameRowH = Math.max(22, pageHeight * 0.035);
  const sigRowBottom = nameRowBottom + nameRowH;
  const sigRowH = Math.max(22, pageHeight * 0.035);

  return {
    pageIndex,
    pageWidth,
    pageHeight,
    signatureBox: {
      x: formLeft + 3,
      y: sigRowBottom + 3,
      w: signatureW - 6,
      h: sigRowH - 6,
    },
    dateBox: {
      x: dateX + 4,
      y: sigRowBottom + 8,
      w: dateW - 8,
      h: 13,
    },
    nameBox: {
      x: formLeft + 3,
      y: nameRowBottom + 7,
      w: nameW - 6,
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

async function findOf286GridAnchors(
  page: any,
  pageIndex: number,
  baseViewport: any,
): Promise<PageAnchors | null> {
  if (typeof document === "undefined") return null;

  const mapProto = Map.prototype as any;
  if (!mapProto.getOrInsertComputed) {
    mapProto.getOrInsertComputed = function getOrInsertComputed(key: unknown, compute: (key: unknown) => unknown) {
      if (!this.has(key)) this.set(key, compute(key));
      return this.get(key);
    };
  }

  const renderScale = 2;
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const isDark = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return pixels[idx] + pixels[idx + 1] + pixels[idx + 2] < 390;
  };

  const groupCenters = (values: number[]) => {
    const groups: number[][] = [];
    for (const value of values) {
      if (!groups.length || value > groups[groups.length - 1][groups[groups.length - 1].length - 1] + 1) {
        groups.push([]);
      }
      groups[groups.length - 1].push(value);
    }
    return groups.map((group) => (group[0] + group[group.length - 1]) / 2);
  };

  const horizontalRows: number[] = [];
  for (let y = Math.floor(height * 0.55); y < Math.floor(height * 0.97); y++) {
    let dark = 0;
    for (let x = 0; x < width; x++) if (isDark(x, y)) dark++;
    if (dark > width * 0.45) horizontalRows.push(y);
  }

  const horizontal = groupCenters(horizontalRows)
    .filter((y, idx, arr) => idx === 0 || y - arr[idx - 1] > height * 0.018)
    .sort((a, b) => a - b);
  if (horizontal.length < 3) return null;

  const [sigTop, nameTop, nameBottom] = horizontal.slice(-3);
  const sigRowH = nameTop - sigTop;
  const nameRowH = nameBottom - nameTop;
  if (sigRowH < height * 0.018 || nameRowH < height * 0.018) return null;

  const verticalCols: number[] = [];
  const y1 = Math.max(0, Math.floor(sigTop) + 1);
  const y2 = Math.min(height - 1, Math.floor(nameTop) - 1);
  for (let x = 0; x < width; x++) {
    let dark = 0;
    for (let y = y1; y <= y2; y++) if (isDark(x, y)) dark++;
    if (dark > (y2 - y1) * 0.4) verticalCols.push(x);
  }

  const vertical = groupCenters(verticalCols).sort((a, b) => a - b);
  if (vertical.length < 4) return null;

  const formLeft = vertical[0];
  const sigDateSplit = vertical[1];
  const dateOfficerSplit = vertical[2];
  if (sigDateSplit - formLeft < width * 0.18 || dateOfficerSplit - sigDateSplit < width * 0.07) {
    return null;
  }

  const toPdfBoxFromPixels = (box: BoxRect): BoxRect => {
    const viewportBox = {
      x: box.x / renderScale,
      y: box.y / renderScale,
      w: box.w / renderScale,
      h: box.h / renderScale,
    };
    const [x1, y1p] = baseViewport.convertToPdfPoint(viewportBox.x, viewportBox.y);
    const [x2, y2p] = baseViewport.convertToPdfPoint(viewportBox.x + viewportBox.w, viewportBox.y + viewportBox.h);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1p, y2p),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2p - y1p),
    };
  };

  const xInset = Math.max(4, width * 0.004);
  const sigFieldTop = sigTop + sigRowH * 0.18;
  const dateFieldTop = sigTop + sigRowH * 0.45;
  const nameFieldTop = nameTop + nameRowH * 0.45;

  return {
    pageIndex,
    pageWidth: baseViewport.width,
    pageHeight: baseViewport.height,
    signatureBox: toPdfBoxFromPixels({
      x: formLeft + xInset,
      y: sigFieldTop,
      w: sigDateSplit - formLeft - xInset * 2,
      h: Math.max(renderScale * 10, nameTop - sigFieldTop - renderScale * 3),
    }),
    dateBox: toPdfBoxFromPixels({
      x: sigDateSplit + xInset,
      y: dateFieldTop,
      w: dateOfficerSplit - sigDateSplit - xInset * 2,
      h: Math.max(renderScale * 9, Math.min(renderScale * 14, nameTop - dateFieldTop - renderScale * 4)),
    }),
    nameBox: toPdfBoxFromPixels({
      x: formLeft + xInset,
      y: nameFieldTop,
      w: dateOfficerSplit - formLeft - xInset * 2,
      h: Math.max(renderScale * 9, nameBottom - nameFieldTop - renderScale * 3),
    }),
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

    // Convert every text item into PDF.js viewport space (origin top-left).
    // Building the boxes in the same space as the rendered preview avoids the
    // vertical mirroring that happens on rotated / landscape OF-286 variants.
    type Item = { str: string; x: number; y: number; w: number; h: number };
    const items: Item[] = [];
    for (const it of textContent.items as any[]) {
      const t = (pdfjsLib as any).Util.transform(viewport.transform, it.transform);
      const x = t[4];
      const y = t[5];
      const h = Math.max(1, Math.abs(it.height ?? t[3] ?? 10));
      const w = Math.max(0, Math.abs(it.width ?? 0));
      const s = String(it.str ?? "").trim();
      if (s) items.push({ str: s, x, y, w, h });
    }

    const toPdfBox = (box: BoxRect): BoxRect => {
      const [x1, y1] = viewport.convertToPdfPoint(box.x, box.y);
      const [x2, y2] = viewport.convertToPdfPoint(box.x + box.w, box.y + box.h);
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
      };
    };

    // Concatenate adjacent items so multi-fragment labels still match.
    // pdfjs commonly splits "30. CONTRACTOR SIGNATURE" into three runs
    // (["30.", "CONTRACTOR", "SIGNATURE"]), so we slide windows of up to
    // 5 adjacent items. Some agency PDFs also contain duplicate / hidden text
    // for these labels. Return ALL candidates and choose the bottom signature
    // block by geometry instead of trusting the first match in PDF text order.
    const collectCompound = (re: RegExp) => {
      const found: Item[] = [];
      for (const single of items) {
        if (re.test(single.str)) found.push(single);
      }
      for (let win = 2; win <= 5; win++) {
        for (let i = 0; i <= items.length - win; i++) {
          const slice = items.slice(i, i + win);
          // Only merge items that sit on (roughly) the same baseline.
          const baseY = slice[0].y;
          if (slice.some((s) => Math.abs(s.y - baseY) > 3)) continue;
          const merged = slice.map((s) => s.str).join(" ");
          if (re.test(merged)) {
            const last = slice[slice.length - 1];
            found.push({
              ...slice[0],
              str: merged,
              w: last.x + last.w - slice[0].x,
            });
          }
        }
      }
      return found;
    };

    const sigCandidates = collectCompound(/^30\.?\s*CONTRACTOR\s*SIGNATURE/i);
    const dateCandidates = collectCompound(/^31\.?\s*DATE/i);
    const recvCandidates = collectCompound(/^32\.?\s*RECEIVING\s*OFFICER/i);
    const nameCandidates = collectCompound(/^34\.?\s*PRINT\s*NAME/i);
    const recvNameCandidates = collectCompound(/^35\.?\s*PRINT\s*NAME/i);

    type SignatureLayout = {
      labelSig: Item;
      labelDate?: Item;
      labelRecv?: Item;
      labelName: Item;
      labelRecvName?: Item;
      score: number;
    };

    let layout: SignatureLayout | undefined;
    for (const labelSig of sigCandidates) {
      for (const labelName of nameCandidates) {
        // Signature row must be below the form body in viewport space.
        if (labelSig.y < ph * 0.5) continue;
        // #34 must be directly below #30.
        if (labelName.y <= labelSig.y) continue;
        const rowGap = labelName.y - labelSig.y;
        if (rowGap < ph * 0.02 || rowGap > ph * 0.16) continue;
        if (Math.abs(labelName.x - labelSig.x) > pw * 0.08) continue;

        const labelDate = dateCandidates
          .filter((d) => d.x > labelSig.x && Math.abs(d.y - labelSig.y) <= Math.max(7, ph * 0.012))
          .sort((a, b) => a.x - b.x)[0];
        const labelRecv = recvCandidates
          .filter((r) => r.x > (labelDate?.x ?? labelSig.x) && Math.abs(r.y - labelSig.y) <= Math.max(7, ph * 0.012))
          .sort((a, b) => a.x - b.x)[0];
        const labelRecvName = recvNameCandidates
          .filter((n) => n.x > labelName.x && Math.abs(n.y - labelName.y) <= Math.max(7, ph * 0.012))
          .sort((a, b) => a.x - b.x)[0];

        // Prefer layouts that have #31, then the lowest valid #30/#34 pair in
        // viewport space. This avoids hidden duplicate labels above the true
        // contractor block.
        const score =
          (labelDate ? 1000 : 0) +
          (labelRecv ? 100 : 0) +
          (labelRecvName ? 50 : 0) +
          labelSig.y;
        if (!layout || score > layout.score) {
          layout = { labelSig, labelDate, labelRecv, labelName, labelRecvName, score };
        }
      }
    }

    const labelSig = layout?.labelSig;
    const labelDate = layout?.labelDate;
    const labelRecv = layout?.labelRecv;
    const labelName = layout?.labelName;
    const labelRecvName = layout?.labelRecvName;

    const anchors: PageAnchors = {
      pageIndex: p,
      pageWidth: pw,
      pageHeight: ph,
    };

    if (!labelSig || !labelName) {
      const gridAnchors = await findOf286GridAnchors(page, p, viewport);
      results.push(gridAnchors ?? getOf286FallbackFields(p, pw, ph));
      continue;
    }

    // Find the first text item below #34 (usually the printed/footer line) so
    // we can keep block 34 out of the footer.
    let footerY = ph;
    for (const it of items) {
      if (it.y > labelName!.y + 5 && it.y < footerY) {
        footerY = it.y;
      }
    }

    // Signature cell: below the #30 label and above the #34 row.
    {
      const right = labelDate ? labelDate.x - 4 : labelSig!.x + 200;
      const top = labelSig!.y + labelSig!.h + 2;
      const cellBottom = labelName!.y - 4;
      const x = labelSig!.x;
      const w = Math.max(40, right - x);
      const h = Math.max(10, cellBottom - top);
      anchors.signatureBox = toPdfBox({ x, y: top, w, h });
    }

    if (labelDate) {
      // Date sits just below the "31. DATE" label in contractor block 31.
      const right = labelRecv ? labelRecv.x - 4 : labelDate.x + 90;
      const top = labelDate.y + labelDate.h + 2;
      const bottom = labelName!.y - 4;
      anchors.dateBox = toPdfBox({
        x: labelDate.x,
        y: top,
        w: Math.max(30, right - labelDate.x),
        h: Math.max(10, Math.min(16, bottom - top)),
      });
    }

    {
      // Print name cell: just under the "34. PRINT NAME AND TITLE" label,
      // clamped before the footer.
      const right =
        (labelRecvName?.x ?? labelDate?.x ?? labelName!.x + 200) - 4;
      const top = labelName!.y + labelName!.h + 2;
      const h = Math.max(10, Math.min(26, footerY - top - 4));
      anchors.nameBox = toPdfBox({
        x: labelName!.x,
        y: top,
        w: Math.max(60, right - labelName!.x),
        h,
      });
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
  dateText?: string;
  placements?: Partial<Pick<PageAnchors, "signatureBox" | "dateBox" | "nameBox">>;
  placementsByPage?: Partial<Pick<PageAnchors, "signatureBox" | "dateBox" | "nameBox">>[];
}): Promise<Blob> {
  const { sourceUrl, signaturePngBlob, signerName, signedAt, dateText, placements, placementsByPage } = opts;

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

  const dateStr = dateText || signedAt.toLocaleDateString("en-US", {
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
    // Use nearly the full cell; tiny inset just to avoid touching the borders.
    const maxW = Math.max(20, box.w - 2);
    const maxH = Math.max(10, box.h + 10);
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    const visualYOffset = Math.min(5, Math.max(0, box.h - h) / 2);
    return {
      x: box.x + 1,
      y: box.y + visualYOffset,
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
    const fields = getOf286FallbackFields(0, pw, ph);
    const sigBox = fields.signatureBox!;
    const fit = fitImage(sigBox);
    page.drawImage(sigImage, { x: fit.x, y: fit.y, width: fit.w, height: fit.h });

    page.drawText(dateStr, {
      x: fields.dateBox!.x,
      y: fields.dateBox!.y,
      size: 9,
      font: helv,
      color: rgb(0, 0, 0),
    });

    page.drawText(signerName, {
      x: fields.nameBox!.x,
      y: fields.nameBox!.y,
      size: 9,
      font: helv,
      color: rgb(0, 0, 0),
    });
  };

  let stampedAny = false;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageSize = page.getSize();
    const pagePlacements = placementsByPage?.[i] ?? placements;
    const anchors = pagePlacements
      ? {
          pageIndex: i,
          pageWidth: pageSize.width,
          pageHeight: pageSize.height,
          signatureBox: pagePlacements.signatureBox,
          dateBox: pagePlacements.dateBox,
          nameBox: pagePlacements.nameBox,
        }
      : anchorsList[i];

    if (anchors?.signatureBox || anchors?.nameBox) {
      if (anchors?.signatureBox) {
        const fit = fitImage(anchors.signatureBox);
        page.drawImage(sigImage, { x: fit.x, y: fit.y, width: fit.w, height: fit.h });
      }
      if (anchors?.dateBox) {
        page.drawText(dateStr, {
          x: anchors.dateBox.x,
          y: anchors.dateBox.y,
          size: 9,
          font: helv,
          color: rgb(0, 0, 0),
        });
      }
      if (anchors?.nameBox) {
        page.drawText(signerName, {
          x: anchors.nameBox.x,
          y: anchors.nameBox.y,
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
