
## Problem

On the 79 fire OF-286, signing produced two visible issues:

1. **White boxes behind the signature and printed name/title.** The signature PNG is opaque white because both `SignaturePicker` (typed previews at `src/components/shift-tickets/SignaturePicker.tsx` lines 92–93, 128–129, 183–184) and `SignatureCanvas` (`src/components/shift-tickets/SignatureCanvas.tsx` lines 33–34, 83–84) fill the canvas with `hsl(0 0% 100%)` before drawing. That fill is baked into the PNG we hand to `pdf-lib`, so pdf-lib stamps a solid white rectangle onto the form and covers the printed lines and adjacent form text. (The printed name/title text itself is drawn by `pdf-lib.drawText` with no background — the "white box" the user sees behind it is the signature image bleeding up into row 34 because the image cell is wider/taller than the actual signature.)
2. **Signature sits too low on this specific PDF.** Anchor detection in `src/lib/pdf-sign.ts` — text-layer labels first, then pixel-grid detection, then hard fractional fallback (`getOf286FallbackFields`) — landed on the wrong row for the 79 fire form. Today the review screen shows the boxes but they're read-only, so there's no way for the user to nudge placement when detection is off.

## Fix

### 1. Make signature PNGs transparent

- `src/components/shift-tickets/SignaturePicker.tsx`
  - Typed preview render loop: remove the white `fillRect` (lines ~92–93); keep `clearRect` only so the alpha channel stays 0 around the glyphs.
  - Draw-mode init (lines ~128–129) and `clearDraw` (lines ~183–184): remove the white `fillRect`; keep `clearRect`. Stroke color stays as-is.
- `src/components/shift-tickets/SignatureCanvas.tsx`
  - Init effect (lines ~33–34) and `clear` (lines ~83–84): remove the white `fillRect`; keep `clearRect`. Add a `clearRect(0,0,rect.width,rect.height)` before setting stroke styles so the canvas visibly starts empty.
- Both files: keep the visible on-screen card background via the existing Tailwind `bg-card` class on the `<canvas>` element so the user still sees a white pad while signing — only the exported PNG changes.
- No changes to `renderTypedSignatureBlob` in `src/components/incidents/OF286SigningReview.tsx` or `src/lib/auto-signature.ts` — those already use `clearRect` only and are already transparent.

### 2. Tighten the signature image footprint in the stamped PDF

In `src/lib/pdf-sign.ts` `fitImage` (lines ~544–561):
- Cap the stamped signature height to the actual PNG aspect ratio; today `maxW = box.w - 2` then `h = w / aspect` can produce a huge tall stamp when the signature cell is short and wide, which pushes ink up into the "34. PRINT NAME AND TITLE" row.
- Add a hard cap of `Math.min(maxH, box.h * 0.9)` and anchor to bottom of the cell (`y: box.y + 1`) so the signature sits on the form's signature line instead of floating and overlapping row 34.

### 3. Let the user drag the placement boxes when detection is off

In `src/components/incidents/OF286SigningReview.tsx`:
- Convert the three overlay `<button>`s (signature / date / name, lines ~261–303) into pointer-draggable elements. Store a per-page `adjust` offset `{ dx, dy }` in state, initialized to `{0,0}`.
- On pointer-down + move, update the offset in CSS px; on pointer-up, convert the CSS px delta back to PDF points using `scales[page.pageIndex]` and merge into the `signatureBox` / `dateBox` / `nameBox` for that page.
- Keep the existing "tap to open picker / edit text" behavior: treat pointer travel < 4 px as a tap, ≥ 4 px as a drag.
- Add a small "Reset placement" text button in the footer next to the checklist that clears offsets back to the detected anchors.
- `handleComplete` already forwards `placementsByPage`, so no changes are needed downstream — the adjusted boxes flow straight into `stampSignatureOntoPdf`.

## Technical notes

- Transparent PNGs from `canvas.toBlob(..., "image/png")` are honored by `pdf-lib.embedPng`, so no changes needed in `stampSignatureOntoPdf`.
- Drag math: `pdfDeltaX = cssDx / scale`, `pdfDeltaY = -cssDy / scale` (PDF y-axis is flipped relative to the DOM overlay coordinate system used by `overlayStyle`).
- No schema or backend changes. No changes to `OF286UploadCard` or the finance-signed flow.

## Out of scope

- Re-running signing on the already-uploaded 79 fire contractor-signed PDF. Once the fix ships the user can tap "Replace" on that stage and re-sign; the audit trail will log the replace event as usual.
- Reworking `findOf286GridAnchors` / `findOf286Anchors` heuristics — drag override is the safety net for edge cases like this one.
