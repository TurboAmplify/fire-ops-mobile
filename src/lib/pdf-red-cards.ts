import jsPDF from "jspdf";
import type { RedCard, Qualification } from "@/services/red-cards";
import { getViewableUrl } from "@/lib/storage-url";

export interface RedCardForPdf {
  card: RedCard;
  memberName: string;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${m}/${day}/${y}`;
}

function slugify(s: string | null | undefined, fallback = "incident"): string {
  return (s || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || fallback;
}

async function fetchImageDataUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const url = (await getViewableUrl(path)) ?? path;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a single combined PDF with one Red Card per crew member.
 * Each card uses two pages (Front / Back) so it mirrors the in-app card view.
 */
export async function generateRedCardsPdfBlob(
  cards: RedCardForPdf[],
  incidentName?: string | null,
): Promise<{ blob: Blob; fileName: string }> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;

  // Pre-fetch photos in parallel
  const photos = await Promise.all(cards.map((c) => fetchImageDataUrl(c.card.photo_url)));

  for (let i = 0; i < cards.length; i++) {
    const { card, memberName } = cards[i];
    const quals = (Array.isArray(card.qualifications) ? card.qualifications : []) as Qualification[];

    // ---------- FRONT PAGE ----------
    if (i > 0) doc.addPage();

    // Red header bar
    doc.setFillColor(178, 34, 34);
    doc.rect(margin, margin, contentW, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RED CARD", margin + 12, margin + 14);
    doc.setFontSize(13);
    doc.text("INCIDENT QUALIFICATION CARD", margin + 12, margin + 28);

    // Agency strip
    doc.setFillColor(20, 20, 20);
    doc.rect(margin, margin + 36, contentW, 18, "F");
    doc.setFontSize(9);
    doc.text((card.agency || "Agency").toUpperCase(), margin + 12, margin + 49);

    // Body
    let y = margin + 70;
    const photoW = 110;
    const photoH = 140;
    if (photos[i]) {
      try {
        doc.addImage(photos[i] as string, "JPEG", margin, y, photoW, photoH);
      } catch {
        doc.setDrawColor(200);
        doc.rect(margin, y, photoW, photoH);
      }
    } else {
      doc.setDrawColor(200);
      doc.rect(margin, y, photoW, photoH);
      doc.setTextColor(150);
      doc.setFontSize(9);
      doc.text("No photo", margin + photoW / 2, y + photoH / 2, { align: "center" });
    }

    // Identity fields next to photo
    const fieldsX = margin + photoW + 16;
    let fy = y + 10;
    doc.setTextColor(0, 0, 0);
    const writeField = (label: string, value: string | null | undefined, x: number, yy: number, w?: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(label.toUpperCase(), x, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const text = value && value.trim().length > 0 ? value : "—";
      const lines = doc.splitTextToSize(text, w ?? 320);
      doc.text(lines, x, yy + 12);
      return yy + 12 + lines.length * 12 + 4;
    };
    fy = writeField("Name", memberName, fieldsX, fy);
    fy = writeField("Certifying Entity", card.card_id, fieldsX, fy);
    fy = writeField("Primary Position", card.primary_position, fieldsX, fy);

    // Lower 2-col grid
    let gy = y + photoH + 22;
    const colW = contentW / 2;
    const gridFields: [string, string][] = [
      ["Work Capacity Test", card.work_capacity_test || "—"],
      ["Fitness Test Date", fmtDate(card.fitness_test_date)],
      ["RT-130 Refresher", card.rt130_refresher_status || "—"],
      ["Issue Date", fmtDate(card.issue_date)],
      ["Review / Expiration", fmtDate(card.review_expiration_date)],
    ];
    for (let g = 0; g < gridFields.length; g++) {
      const col = g % 2;
      const row = Math.floor(g / 2);
      const x = margin + col * colW;
      const yy = gy + row * 36;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(gridFields[g][0].toUpperCase(), x, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(gridFields[g][1], x, yy + 13);
    }

    if (card.signer_name || card.signer_title) {
      const sy = gy + Math.ceil(gridFields.length / 2) * 36 + 16;
      doc.setDrawColor(220);
      doc.line(margin, sy, margin + contentW, sy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(card.signer_name || "", margin, sy + 14);
      if (card.signer_title) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(110);
        doc.text(card.signer_title.toUpperCase(), margin, sy + 26);
      }
    }

    // ---------- BACK PAGE ----------
    doc.addPage();
    doc.setFillColor(178, 34, 34);
    doc.rect(margin, margin, contentW, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CURRENT INCIDENT QUALIFICATIONS", pageW / 2, margin + 22, { align: "center" });

    doc.setFillColor(20, 20, 20);
    doc.rect(margin, margin + 36, contentW, 18, "F");
    doc.setFontSize(9);
    doc.text((card.agency || "Agency").toUpperCase(), pageW / 2, margin + 49, { align: "center" });

    // Sub-header line
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Crew Member: ${memberName}`, margin, margin + 76);

    // Qualifications table
    let ty = margin + 96;
    const cols = [
      { label: "QUALIFICATION", w: contentW * 0.55 },
      { label: "CODE", w: contentW * 0.2 },
      { label: "STATUS", w: contentW * 0.25 },
    ];
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, ty - 12, contentW, 18, "F");
    let cx = margin + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(70);
    cols.forEach((c) => {
      doc.text(c.label, cx, ty);
      cx += c.w;
    });
    ty += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    if (quals.length === 0) {
      doc.setTextColor(150);
      doc.text("No qualifications recorded.", margin + 6, ty + 4);
      ty += 18;
    } else {
      for (const q of quals) {
        if (ty > 720) {
          doc.addPage();
          ty = margin + 20;
        }
        cx = margin + 6;
        const qualLines = doc.splitTextToSize(q.qualification || "—", cols[0].w - 8);
        doc.text(qualLines, cx, ty);
        cx += cols[0].w;
        doc.setFont("courier", "normal");
        doc.text(q.code || "—", cx, ty);
        cx += cols[1].w;
        doc.setFont("helvetica", "normal");
        doc.text(q.status || "—", cx, ty);
        ty += Math.max(14, qualLines.length * 12) + 4;
        doc.setDrawColor(235);
        doc.line(margin, ty - 4, margin + contentW, ty - 4);
      }
    }

    if (card.restrictions_notes) {
      ty += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text("RESTRICTIONS / NOTES", margin, ty);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const notes = doc.splitTextToSize(card.restrictions_notes, contentW);
      doc.text(notes, margin, ty + 14);
      ty += 14 + notes.length * 12;
    }

    // Footer block
    let foy = Math.max(ty + 20, 660);
    if (card.emergency_contact_name || card.emergency_contact_phone) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text("EMERGENCY CONTACT", margin, foy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const name = [card.emergency_contact_name, card.emergency_contact_relation ? `(${card.emergency_contact_relation})` : ""]
        .filter(Boolean)
        .join(" ");
      doc.text(name || "—", margin, foy + 14);
      if (card.emergency_contact_phone) doc.text(card.emergency_contact_phone, margin, foy + 28);
    }
    if (card.return_address) {
      const rx = margin + contentW / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text("IF FOUND, RETURN TO", rx, foy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const addr = doc.splitTextToSize(card.return_address, contentW / 2 - 8);
      doc.text(addr, rx, foy + 14);
    }
  }

  const blob = doc.output("blob");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `red-cards-${slugify(incidentName)}-${stamp}.pdf`;
  return { blob, fileName };
}
