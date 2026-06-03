import "@fontsource/dancing-script/700.css";

const AUTO_FONT = "Dancing Script";
const AUTO_WEIGHT = 700;

/**
 * Render a typed-script signature PNG from a printed name. Matches the
 * auto-signature style used by OF-286 signing.
 */
export async function renderAutoSignatureBlob(name: string): Promise<Blob | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    await document.fonts.load(`${AUTO_WEIGHT} 96px "${AUTO_FONT}"`, trimmed);
  } catch {
    // ignore – fallback font will be used
  }
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;
  const fontSize = 96;
  measure.font = `${AUTO_WEIGHT} ${fontSize}px "${AUTO_FONT}", cursive`;
  const metrics = measure.measureText(trimmed);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.85;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.25;
  const pad = 6;
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = Math.ceil(ascent + descent) + pad * 2;
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "hsl(222 47% 11%)";
  ctx.font = `${AUTO_WEIGHT} ${fontSize}px "${AUTO_FONT}", cursive`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(trimmed, pad, pad + ascent);
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
}

export const AUTO_SIGNATURE_FONT = AUTO_FONT;
