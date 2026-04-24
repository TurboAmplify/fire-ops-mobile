/**
 * Generic table-style PDF exporter. Used by activity, audit, and payroll-summary
 * reports so they share consistent header / pagination / styling.
 */
import { shareOrDownload, safeFilename } from "./share";

export interface PdfColumn {
  header: string;
  key: string;
  width: number; // points
  align?: "left" | "right" | "center";
  format?: (v: unknown) => string;
}

export interface PdfTableSection {
  title?: string;
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
}

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  organizationName?: string;
  sections: PdfTableSection[];
  filenameBase: string;
  landscape?: boolean;
}

export async function downloadTablePdf(opts: PdfTableOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: opts.landscape ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  const newPage = () => {
    doc.addPage();
    y = margin;
  };

  const ensure = (h: number) => {
    if (y + h > pageH - margin) newPage();
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(opts.title, margin, y);
  y += 18;
  if (opts.organizationName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(opts.organizationName, margin, y);
    y += 12;
  }
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(opts.subtitle, margin, y);
    y += 12;
  }
  doc.setTextColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  for (const section of opts.sections) {
    if (section.title) {
      ensure(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(section.title, margin, y);
      y += 14;
    }

    // Header row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    const rowH = 16;
    ensure(rowH);
    doc.rect(margin, y - 11, pageW - margin * 2, rowH, "F");
    let x = margin + 4;
    section.columns.forEach((col) => {
      const tx = col.align === "right" ? x + col.width - 4 : col.align === "center" ? x + col.width / 2 : x;
      doc.text(col.header, tx, y, { align: col.align ?? "left" });
      x += col.width;
    });
    y += rowH;

    // Data rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    if (section.rows.length === 0) {
      ensure(rowH);
      doc.setTextColor(140);
      doc.text("No data in this range.", margin + 4, y);
      doc.setTextColor(0);
      y += rowH;
    }

    section.rows.forEach((row, idx) => {
      ensure(rowH);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 11, pageW - margin * 2, rowH, "F");
      }
      let cx = margin + 4;
      section.columns.forEach((col) => {
        const raw = row[col.key];
        const text = col.format ? col.format(raw) : raw == null ? "" : String(raw);
        const tx = col.align === "right" ? cx + col.width - 4 : col.align === "center" ? cx + col.width / 2 : cx;
        // Truncate long text to column width
        const maxChars = Math.floor(col.width / 4.2);
        const displayed = text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text;
        doc.text(displayed, tx, y, { align: col.align ?? "left" });
        cx += col.width;
      });
      y += rowH;
    });

    y += 10;
  }

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 18, { align: "right" });
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, pageH - 18);
    doc.setTextColor(0);
  }

  const blob = doc.output("blob");
  shareOrDownload(safeFilename(opts.filenameBase, "pdf"), blob, "application/pdf");
}
