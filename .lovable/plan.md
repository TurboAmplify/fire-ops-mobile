## Goal
One combined Schedule of Accounts covering all five fires, reusing the number already used for the 79 Fire (**#9**), delivered as a downloadable PDF, and set the org's next schedule number to **10**.

## Line items (from the submitted OF-286 invoices)
| Account debtor | Invoice # | Amount | Invoice date |
|---|---|---|---|
| SD Division of Wildland Fire (79 Fire) | F-2026-SD-CUX-260232-0013A | $8,000.00 | 07/24/2026 |
| BIA/OCFO Div of Acct Ops (Stick) | F-2026-SD-PRA-000054-0001A | $22,205.00 | 07/25/2026 |
| BIA/OCFO Div of Acct Ops (Ironwood) | F-2026-SD-RBA-000068-0001A | $8,876.00 | 07/25/2026 |
| BIA/OCFO Div of Acct Ops (Old Strike) | F-2026-SD-RBA-000070-0001B | $8,958.00 | 07/25/2026 |
| BIA/OCFO Div of Acct Ops (Willow) | F-2026-SD-RBA-000067-0001A | $26,713.00 | 07/25/2026 |

**Total: $74,752.00** — 5 accounts sold; reserve at the org's saved reserve %.

## Exact format match
1. Download the stored PDF for schedule **#9 (79 Fire)** from your factoring documents and render it to images — this is the reference.
2. Generate the combined document with the **same code the app uses** (`src/lib/pdf-schedule-of-accounts.ts`), run headlessly with schedule number 9 and the five line items, pulling live values from Dry Lightning's factoring settings (factor company, seller, agreement date, reserve %, signer name/title, stored signature).
3. Render the new PDF to images and compare side-by-side against the reference — title block, DATE / SCHEDULE NO. row, totals box, SELLER line, 4-column table, the six numbered certification points, IN WITNESS WHEREOF line, and the By / Print Name / Title signature block. Any difference in wording, position, or styling gets corrected until it matches; the only intended differences are the extra table rows and the new totals.
4. Save the verified file to your documents as `Schedule-of-Accounts-9.pdf` for download.

## Backend cleanup (data only, no schema change)
- Re-point the four separate submissions (#10–#13) onto schedule **#9** so the Factoring Dashboard shows one schedule for this batch, each incident keeping its own amount.
- Set Dry Lightning's `next_schedule_number` to **10**.

No app UI changes in this pass — one-off document plus the numbering fix.
