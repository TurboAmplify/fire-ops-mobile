# Combined Shift Ticket Packet — 270 Fire, Chapter Hill, Owl Fire

Goal: one downloadable PDF containing every shift ticket for DL31 and DL62 on these three fires, with correct dates on every ticket and the Resource Order number shown next to the truck number.

## What's in the data today

32 tickets, all trucks:

| Fire | Truck | Tickets | Dates | RO # |
|---|---|---|---|---|
| 270 Fire | DL31 | 4 | 8/06–8/09 | E-3 |
| 270 Fire | DL62 | 7 | 8/03–8/08 | missing on all 7 |
| Chapter Hill | DL31 | 6 | 8/10–8/15 | E-1 |
| Chapter Hill | DL62 | 10 | 8/09–8/17 | 000084 |
| Owl Fire | DL31 | 2 | 8/16–8/17 | E-2 |
| Owl Fire | DL62 | 3 | 8/17–8/18 | E-1 |

## Problems found (these get fixed before the packet is built)

1. **The 8/07 vs 8/08 mismatch the finance officer flagged — confirmed.** DL62 / 270 Fire ticket has the equipment line dated **8/07** but the crew (personnel) rows dated **8/08**, and it has zero hours (no start time, stop 19:30). That is the ticket printing two different dates.
2. **270 Fire is split across two incident records** in the system — DL31 sits on one, DL62 on the other. Same fire, entered twice. This is why the two trucks never appear together.
3. **DL62 on 270 Fire has no Resource Order number** on any of its 7 tickets, so the packet would print the truck with a blank RO.
4. **Owl Fire / DL62** has a blank 0-hour draft with equipment dated 8/17 and crew dated 8/18, plus a second 8/18 ticket that is an exact duplicate of the first 8/18 ticket.
5. **Chapter Hill / DL62 has two tickets dated 8/10** — one 07:00–21:30 (14.5 hrs), one 07:00–19:30 (12.5 hrs). Looks like a correction that was saved as a new ticket rather than an edit.
6. **270 Fire / DL62 has two tickets dated 8/03** — 07:00–16:00 and 16:01–20:30 marked "Travel". These look intentional (mob split) and will both be kept.

## Fixes to apply

- Correct the 8/07 DL62 ticket so the top and bottom dates match, and fill its missing hours from the shift's actual start/stop.
- Merge the duplicate 270 Fire incident so both DL31 and DL62 live on one fire.
- Add the DL62 Resource Order number for 270 Fire (needs your input — see question below).
- Delete the blank 8/17 Owl draft and the duplicate 8/18 Owl ticket.
- Keep one of the Chapter Hill 8/10 tickets (needs your input).
- Verify every remaining ticket's equipment date, crew dates, and shift date all agree.

## Deliverable

A single combined PDF, ordered by fire then truck then date, each page an OF-297 showing the truck number and the RO number in the header (e.g. "DL62 · RO 000084"). Every page is rendered and visually checked before delivery.

## Questions before building

- What is the correct Resource Order number for **DL62 on the 270 Fire** (8/03–8/08)?
- For **Chapter Hill DL62 on 8/10**, which is correct — the 14.5-hour ticket or the 12.5-hour one?
- Should the packet include the two remaining **draft** tickets (270 DL31 8/09 and Chapter Hill DL62 8/14, both unsigned by the supervisor), or only signed tickets?

## Technical notes

Fixes are data corrections in `shift_tickets` / `incident_trucks` (dates, `resource_order_number`, soft-deletes with a reason). The packet is generated with the existing `generateOF297PdfBlob` renderer so it matches in-app output exactly; output written to `/mnt/documents`.
