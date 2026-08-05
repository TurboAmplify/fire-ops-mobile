# Signed Shift Ticket Packet — Dry Lightning, 7/22 – 8/03

Produce one combined PDF containing the signed OF-297 shift tickets for the requested days, and clean up the duplicate tickets in the app first so the packet and payroll/billing agree.

## Step 1 — Fix the ticket data

**Re-date the 7/31 duplicate to 7/30**
There are two identical War Bonnet tickets dated 7/31 (07:00–19:00, 12h, 3 crew). One of them was meant to be 7/30. The earlier-created one gets moved to 7/30 (equipment and all personnel rows), so the run reads 7/29, 7/30, 7/31 with no gap.

**Remove exact duplicates on 8/03**
8/03 currently has five tickets:

```text
270 Fire   07:00–16:00  9.0h    x2  -> keep 1, delete 1
270 Fire   16:01–20:30  4.5h    x2  -> keep 1, delete 1   (Travel)
War Bonnet 16:01–20:30  4.5h    x1  -> delete (same travel, wrong incident)
```

The 16:01–20:30 travel block was logged three times across two incidents. Keeping the 270 Fire copy (travel home off the last fire) and deleting the other two. Deletions use the existing soft-delete path with a reason of "Duplicate entry — removed during 7/22–8/03 packet review", so nothing is lost from the audit history.

**Note on 7/22**
That ticket's equipment row is dated 7/22 but its crew rows are dated 7/24. The crew rows will be corrected to 7/22 to match.

## Step 2 — Build the packet

Final contents, one OF-297 page per ticket, in date order:

| Date | Incident | Hours |
|---|---|---|
| 7/22 | Hihanni Sica | per ticket |
| 7/28 | War Bonnet | per ticket |
| 7/29 | War Bonnet | per ticket |
| 7/30 | War Bonnet | 12.0 |
| 7/31 | War Bonnet | 12.0 |
| 8/01 | War Bonnet | per ticket |
| 8/02 | War Bonnet | per ticket |
| 8/03 | 270 Fire | 9.0 |
| 8/03 | 270 Fire (travel) | 4.5 |

Every one of these is `final` with both the contractor rep and the government supervisor signature on file, and both signature images are drawn into the PDF exactly as they appear in the app.

The PDF is rendered with the same OF-297 layout the app already uses for single-ticket export — same header auto-fill, equipment block, personnel block, remarks, and signature blocks — so the pages are identical to what a finance officer would receive one at a time.

Delivered as a single downloadable file, `dry-lightning-shift-tickets-2026-07-22-to-08-03.pdf`, and visually checked page by page before handing it over.

## Technical notes

- Data fixes run as one migration: an `UPDATE` re-dating the 7/30 ticket's `equipment_entries` / `personnel_entries` JSON, an `UPDATE` correcting the 7/22 personnel dates, and soft-delete `UPDATE`s (`deleted_at`, `deleted_by_user_id`, `deleted_reason`) on the three duplicate rows. No schema changes.
- The packet is generated in the sandbox from the corrected rows, reusing the layout logic in `src/components/shift-tickets/generateOF297Pdf.ts`, with signature PNGs pulled from the `signatures` bucket and composited on white so they don't render as black boxes.
- No app UI changes. This is a one-off export plus a data correction; if you also want a "download date range" button inside the app later, that's a separate piece of work.
