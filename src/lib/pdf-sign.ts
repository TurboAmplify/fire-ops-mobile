import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Stamp a signature image onto every page of a PDF in the OF-286 contractor
 * signature region (Block 30 — bottom-left of each page), along with the date
 * (Block 31) and printed name (Block 34).
 *
 * The OF-286 has a signature row near the bottom of every page. Layout varies
 * slightly between agency exports, but the contractor signature box is always
 * the leftmost cell of the signature row, roughly:
 *   - x: ~1% to ~38% of page width
 *   - y: ~6% to ~12% of page height (above the print-name row and footer)
 *
 * Falls back to a single bottom-right stamp on the last page for non-OF-286
 * documents (e.g. plain image scans we converted to PDF).
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
    sourceBytes[3] === 0x46; // %PDF

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
    // Single-page image scan: stamp once, bottom-right.
    const page = pages[0];
    const { width: pw, height: ph } = page.getSize();
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
      color: rgb(0, 0, 0),
    });
    const out = await pdfDoc.save();
    return new Blob([out.slice().buffer as ArrayBuffer], { type: "application/pdf" });
  }

  // Real OF-286 PDF: stamp signature + date + name on each page in Block 30/31/34.
  for (const page of pages) {
    const { width: pw, height: ph } = page.getSize();

    // Block 30 — Contractor Signature (bottom-left)
    // Approx box: x [0.01..0.38] of pw, y [0.058..0.115] of ph
    const sigBoxX = pw * 0.015;
    const sigBoxY = ph * 0.062;
    const sigBoxW = pw * 0.36;
    const sigBoxH = ph * 0.05;

    // Fit signature inside the box, preserving aspect ratio.
    const aspect = sigImage.width / sigImage.height;
    let drawW = sigBoxW;
    let drawH = drawW / aspect;
    if (drawH > sigBoxH) {
      drawH = sigBoxH;
      drawW = drawH * aspect;
    }
    const drawX = sigBoxX + (sigBoxW - drawW) / 2;
    const drawY = sigBoxY + (sigBoxH - drawH) / 2;
    page.drawImage(sigImage, { x: drawX, y: drawY, width: drawW, height: drawH });

    // Block 31 — Date (right of signature)
    const dateX = pw * 0.39;
    const dateY = ph * 0.078;
    page.drawText(dateStr, {
      x: dateX,
      y: dateY,
      size: 10,
      font: helv,
      color: rgb(0, 0, 0),
    });

    // Block 34 — Print Name and Title (row directly below Block 30).
    // Place clearly inside the cell, away from the page edge and above the
    // "Printed:" footer line.
    const nameX = pw * 0.06;
    const nameY = ph * 0.058;
    page.drawText(signerName, {
      x: nameX,
      y: nameY,
      size: 9,
      font: helv,
      color: rgb(0, 0, 0),
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
