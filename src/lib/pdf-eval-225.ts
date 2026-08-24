import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  EVAL_FACTORS,
  RATING_COLUMNS,
  RATING_SCORES,
  getScore,
  type EvalRatings,
  type RatingColumnKey,
} from "@/lib/eval-225";

export interface EvalPdfInput {
  subject_name: string | null;
  subject_home_unit: string | null;
  fire_name: string | null;
  fire_number: string | null;
  fire_location: string | null;
  fire_position: string | null;
  assignment_from: string | null;
  assignment_to: string | null;
  acres_burned: string | null;
  fuel_types: string | null;
  work_category_other: string | null;
  other_factor_label: string | null;
  ratings: EvalRatings | null;
  remarks: string | null;
  rater_name: string | null;
  rater_home_unit: string | null;
  rater_position: string | null;
  rater_signed_date: string | null;
  employee_signed_date: string | null;
  raterSignaturePng?: Uint8Array | null;
  employeeSignaturePng?: Uint8Array | null;
}

const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.35, 0.35, 0.35);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function box(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor: BLACK, borderWidth: 0.7 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
}

/** Render a filled ICS-225 on a single letter page. */
export async function generateEvalPdf(input: EvalPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const L = 30;
  const R = 582;
  const W = R - L;
  let y = 760;

  const text = (s: string, x: number, yy: number, size = 8, f: PDFFont = font, color = BLACK) =>
    page.drawText(s || "", { x, y: yy, size, font: f, color });

  // Title + instructions
  const title = "INCIDENT PERSONNEL PERFORMANCE RATING";
  text(title, L + (W - bold.widthOfTextAtSize(title, 11)) / 2, y, 11, bold);
  y -= 12;
  const instr =
    "INSTRUCTIONS: The immediate job supervisor will prepare this form for each subordinate. It will be delivered to the planning section before the rater leaves the fire. Rating will be reviewed with employee who will sign at the bottom.";
  for (const line of wrap(instr, font, 6.5, W)) {
    text(line, L, y, 6.5, font, GREY);
    y -= 8;
  }
  const note = "THIS RATING TO BE USED ONLY FOR DETERMINING AN INDIVIDUAL'S PERFORMANCE";
  text(note, L + (W - bold.widthOfTextAtSize(note, 7)) / 2, y, 7, bold);
  y -= 12;

  // Header blocks
  const drawBlock = (x: number, w: number, top: number, h: number, label: string, value: string) => {
    box(page, x, top - h, w, h);
    text(label, x + 3, top - 8, 5.5, bold, GREY);
    const lines = wrap(value, font, 8, w - 6).slice(0, 2);
    let ly = top - 18;
    for (const l of lines) {
      text(l, x + 3, ly, 8);
      ly -= 9;
    }
  };

  const rowH = 30;
  const half = W / 2;
  drawBlock(L, half, y, rowH, "1. NAME", input.subject_name ?? "");
  drawBlock(L + half, half, y, rowH, "2. FIRE NAME AND NUMBER", [input.fire_name, input.fire_number].filter(Boolean).join("  —  "));
  y -= rowH;
  drawBlock(L, half, y, rowH, "3. HOME UNIT (ADDRESS)", input.subject_home_unit ?? "");
  drawBlock(L + half, half, y, rowH, "4. LOCATION OF FIRE (ADDRESS)", input.fire_location ?? "");
  y -= rowH;
  const q = W / 4;
  drawBlock(L, q, y, rowH, "5. FIRE POSITION", input.fire_position ?? "");
  drawBlock(L + q, q, y, rowH, "6. DATE OF ASSIGNMENT", `${fmtDate(input.assignment_from)} to ${fmtDate(input.assignment_to)}`);
  drawBlock(L + q * 2, q, y, rowH, "7. ACRES BURNED", input.acres_burned ?? "");
  drawBlock(L + q * 3, q, y, rowH, "8. FUEL TYPE(S)", input.fuel_types ?? "");
  y -= rowH + 14;

  // Evaluation instructions
  text("9. EVALUATION", L, y, 7.5, bold);
  y -= 9;
  const rules =
    "Enter X under appropriate rating number and under proper heading for each category listed. " +
    RATING_SCORES.map((s) => `${s.short} - ${s.label}. ${s.help}`).join("  ");
  for (const line of wrap(rules, font, 6, W)) {
    text(line, L, y, 6, font, GREY);
    y -= 7;
  }
  y -= 4;

  // Ratings grid
  const factorColW = 170;
  const cellW = (W - factorColW) / 16;
  const headH = 22;
  const cellH = 15.5;

  const gridTop = y;
  // header: group labels
  box(page, L, gridTop - headH, factorColW, headH);
  text("RATING FACTORS", L + 4, gridTop - 14, 7, bold);
  RATING_COLUMNS.forEach((c, ci) => {
    const gx = L + factorColW + ci * cellW * 4;
    box(page, gx, gridTop - headH / 2, cellW * 4, headH / 2);
    const label = c.key === "other" ? (input.work_category_other?.trim() || "Other (Specify)") : c.label;
    const size = 6.5;
    text(label, gx + Math.max(2, (cellW * 4 - bold.widthOfTextAtSize(label, size)) / 2), gridTop - 8, size, bold);
    RATING_SCORES.forEach((s, si) => {
      const cx = gx + si * cellW;
      box(page, cx, gridTop - headH, cellW, headH / 2);
      text(s.short, cx + cellW / 2 - 2, gridTop - headH + 3.5, 6.5, bold);
    });
  });

  let ry = gridTop - headH;
  EVAL_FACTORS.forEach((f) => {
    box(page, L, ry - cellH, factorColW, cellH);
    const label =
      f.key === "other" && input.other_factor_label?.trim()
        ? `Other — ${input.other_factor_label}`
        : f.label;
    const lines = wrap(label, font, 6.8, factorColW - 6);
    text(lines[0] ?? "", L + 4, ry - 10, 6.8);
    RATING_COLUMNS.forEach((c, ci) => {
      RATING_SCORES.forEach((s, si) => {
        const cx = L + factorColW + (ci * 4 + si) * cellW;
        box(page, cx, ry - cellH, cellW, cellH);
        if (getScore(input.ratings, f.key, c.key as RatingColumnKey) === s.value) {
          text("X", cx + cellW / 2 - 2.5, ry - 11, 8, bold);
        }
      });
    });
    ry -= cellH;
  });

  y = ry - 8;

  // Remarks
  const remarkLines = wrap(input.remarks ?? "", font, 8, W - 8);
  const remarkH = Math.max(70, 16 + remarkLines.length * 10);
  box(page, L, y - remarkH, W, remarkH);
  text("10. REMARKS", L + 4, y - 9, 6, bold, GREY);
  let rly = y - 20;
  for (const line of remarkLines.slice(0, 12)) {
    text(line, L + 4, rly, 8);
    rly -= 10;
  }
  y -= remarkH + 6;

  // Signature blocks
  const sigH = 42;
  const embed = async (png?: Uint8Array | null) => {
    if (!png || png.length === 0) return null;
    try {
      return await pdf.embedPng(png);
    } catch {
      return null;
    }
  };
  const raterImg = await embed(input.raterSignaturePng);
  const empImg = await embed(input.employeeSignaturePng);

  const drawSig = (x: number, w: number, top: number, label: string, img: Awaited<ReturnType<typeof embed>>, printed: string) => {
    box(page, x, top - sigH, w, sigH);
    text(label, x + 3, top - 8, 5.5, bold, GREY);
    if (printed) text(printed, x + 3, top - 18, 7.5, font, GREY);
    if (img) {
      const maxW = w - 12;
      const maxH = 18;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      page.drawImage(img, {
        x: x + 5,
        y: top - sigH + 5,
        width: img.width * scale,
        height: img.height * scale,
      });
    }
  };

  // A signature with no stored date means it was just drawn (review/preview) —
  // show today so the form never prints a blank date next to a signature.
  const todayLocal = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  })();
  const empDate = input.employee_signed_date || (empImg ? todayLocal : null);
  const raterDate = input.rater_signed_date || (raterImg ? todayLocal : null);

  drawSig(L, W * 0.72, y, "11. EMPLOYEE (SIGNATURE) — THIS RATING HAS BEEN DISCUSSED WITH ME", empImg, input.subject_name ?? "");
  drawBlock(L + W * 0.72, W * 0.28, y, sigH, "12. DATE", fmtDate(empDate));
  y -= sigH;
  drawSig(L, W * 0.4, y, "13. RATED BY (SIGNATURE)", raterImg, input.rater_name ?? "");
  drawBlock(L + W * 0.4, W * 0.24, y, sigH, "14. HOME UNIT (ADDRESS)", input.rater_home_unit ?? "");
  drawBlock(L + W * 0.64, W * 0.18, y, sigH, "15. POSITION ON FIRE", input.rater_position ?? "");
  drawBlock(L + W * 0.82, W * 0.18, y, sigH, "16. DATE", fmtDate(raterDate));

  return await pdf.save();
}

export async function fetchPngBytes(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}
