# Take a photo of a Resource Order

Right now every resource order entry point only offers a file picker. Add a camera option next to it so a crew boss can snap the paper RO in the field and have it parsed the same way an uploaded PDF is.

## What changes for the user

Everywhere an RO can be attached, there will be two buttons instead of one:

- **Take Photo** — opens the phone camera directly (rear camera), captures the RO, uploads it, and runs the same AI parse.
- **Upload** — unchanged file picker (photos or PDFs).

On desktop the camera button falls back to the normal file picker, so nothing breaks there.

## Where it appears

- New incident screen (resource order step)
- Create incident from agreement
- Incident detail → truck card → Resource Orders section
- Add Resource Order sheet (attach RO to an existing incident/truck)

## Technical notes

- Add a second hidden `<input type="file" accept="image/*" capture="environment">` alongside the existing input in each of the four places: `src/pages/IncidentCreate.tsx`, `src/pages/IncidentFromAgreement.tsx`, `src/components/incidents/ResourceOrderSection.tsx`, `src/components/incidents/AddResourceOrderSheet.tsx`. Both inputs call the existing handler — no upload, storage, or parsing logic changes.
- To avoid duplicating markup four times, extract a small shared `ResourceOrderFileButtons` component (camera + upload labels, `uploading` state, disabled handling) and use it in all four spots. Matches the existing pattern in `TruckPhotoSection` / `RedCardEditor`.
- Touch targets stay ≥44px, buttons use existing `touch-target` and semantic token classes.

## Out of scope

Multi-page capture (several photos into one RO) — say the word if ROs commonly run more than one page and I'll add it.
