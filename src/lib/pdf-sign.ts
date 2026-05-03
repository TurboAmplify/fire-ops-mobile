import { PDFDocument } from "pdf-lib";

/**
 * Stamp a signature image onto every page of a PDF (bottom-right corner)
 * along with the signer's name and timestamp. Falls back to appending a
 * signature page if the source is not a PDF (e.g. an image scan of OF-286).
 *
 * Returns a Blob of the new signed PDF.
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
  if (isPdf) {
    pdfDoc = await PDFDocument.load(sourceBytes);
  } else {
    // Source is an image — embed it as a single page.
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

  // Stamp on the last page (typical signature location).
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pw, height: ph } = lastPage.getSize();

  const sigW = Math.min(220, pw * 0.32);
  const sigH = sigW * (sigImage.height / sigImage.width);
  const margin = 24;
  const x = pw - sigW - margin;
  const y = margin + 14;

  lastPage.drawImage(sigImage, { x, y, width: sigW, height: sigH });

  const meta = `${signerName}  •  ${signedAt.toLocaleString()}`;
  lastPage.drawText(meta, {
    x,
    y: y - 12,
    size: 8,
  });

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
