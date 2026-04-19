

Confirming first: the truck photo **upload** flow is wired and working — file goes to the `truck-photos` storage bucket and a row is written to `truck_photos` (gallery) or `trucks.photo_url` (hero). There is **no AI parsing** of those photos today. The `PHOTO_LABELS` list (VIN Plate, Registration, etc.) was set up as manual labels only.

You asked for both: verify upload works *and* add AI parsing. Here's the plan.

---

# Truck photo AI parsing

## What you'll get

A new **"Scan with AI"** button inside `TruckPhotoSection`. Flow:

1. User taps "Scan VIN / Registration" (camera or library picker).
2. Photo uploads to `truck-photos` as usual.
3. Edge function reads the image and extracts whatever it can find: **VIN, license plate, year, make, model, registration expiration**.
4. A small confirmation sheet appears showing the extracted fields with checkboxes ("Apply VIN", "Apply plate", etc.).
5. User taps "Apply" → fields are written to the `trucks` row (only the ones they kept). Photo gets auto-labeled "VIN Plate" or "Registration" based on what was detected.
6. If nothing useful was found, friendly toast: "Couldn't read details from this photo — try a clearer shot of the VIN plate."

Existing manual upload buttons stay exactly as they are — this is additive.

## Backend — new edge function

`supabase/functions/parse-truck-photo/index.ts` (mirrors the existing `parse-receipt` pattern):
- Accepts `{ fileUrl }` (signed URL of the just-uploaded photo).
- Calls Lovable AI Gateway (`google/gemini-2.5-flash` — good vision + cheap) with a tool-call schema for structured output:
  ```
  { vin, license_plate, year, make, model, 
    registration_expires, detected_document_type: "vin_plate"|"registration"|"other" }
  ```
- Returns `{ parsed: {...} }`. Any field the model isn't confident about comes back as `null`.
- Handles 429 / 402 with friendly error messages.
- Registered in `supabase/config.toml` with `verify_jwt = false` (matches other parse-* functions).

## Frontend — small additions

**`src/services/fleet.ts`**
- New `parseTruckPhoto(fileUrl: string)` that invokes the edge function.
- New `applyParsedFieldsToTruck(truckId, fields)` helper.

**`src/components/fleet/TruckPhotoSection.tsx`**
- Add a third button: **"Scan VIN / Registration"** (camera icon, distinct color so it stands out).
- After upload, call `parseTruckPhoto`, show a small `Sheet` with the extracted fields + checkboxes + "Apply" button.
- On apply, mutate the truck and show a success toast with what was updated.
- Auto-set `photo_label` based on `detected_document_type`.

**Loading + error states:** spinner during scan, toast on no-match, toast on rate-limit (429) and credits (402).

## Verifying upload works (your other ask)

After implementing, I'll test by uploading a sample photo end-to-end and check:
1. File lands in `truck-photos` bucket at `{org_id}/{truck_id}/{uuid}.{ext}`.
2. Row appears in `truck_photos` table with correct `truck_id`, `organization_id`, `file_url`.
3. Image renders via `SignedImage`.
4. (For hero) `trucks.photo_url` is updated and the thumbnail shows in the Fleet list.

If anything is broken in the existing upload flow, I'll fix it as part of this same change.

## Files

- New: `supabase/functions/parse-truck-photo/index.ts`
- Edited: `supabase/config.toml` (register the function with `verify_jwt = false`)
- Edited: `src/services/fleet.ts` (add `parseTruckPhoto` + apply helper)
- Edited: `src/components/fleet/TruckPhotoSection.tsx` (Scan button + confirmation sheet)

## Out of scope (ask if you want these)

- Parsing the **hero photo** (`TruckHeroPhoto`) — keeping AI scanning in the gallery section only, since hero is meant to be a clean exterior shot.
- Document OCR for `truck_documents` (PDFs of insurance, DOT cards) — separate feature.
- Bulk re-scan of existing photos — manual one-by-one only for v1.

