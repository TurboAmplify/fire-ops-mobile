## Goal
Create Part 2 of DL62 on the Hihanni Sica incident and attach the new Resource Order PDF (`ROF_HihanniSica_SDRBA000076_E1.pdf`) to it, so Part 1 (7/19–7/20 crew) and Part 2 (new crew) stay fully separate for shift tickets, OF-286s, and factoring.

## Steps

1. **Insert Part 2 row for DL62 on Hihanni Sica**
   - Use existing `part_number` schema on `incident_trucks`.
   - New row: same `incident_id` (`50f79c2c…`) + same `truck_id` (`5d47d2ad…`), `part_number = 2`, `status = 'assigned'`, `organization_id = 2ffa93de…` (Dry Lightning).
   - Part 1 (id `74e8cb74…`) stays untouched and Active.

2. **Upload the RO PDF to the `resource-orders` storage bucket**
   - Path: `2ffa93de-506d-4aa7-a53e-a3a04d9626be/<uuid>.pdf` (matches `uploadResourceOrderFile` convention).
   - Source file: `/mnt/user-uploads/ROF_HihanniSica_SDRBA000076_E1.pdf`.

3. **Insert `resource_orders` row for the new Part 2**
   - `incident_truck_id` = new Part 2 id, `organization_id` = Dry Lightning, `file_url` = public URL from step 2, `file_name` = `ROF_HihanniSica_SDRBA000076_E1.pdf`.
   - Leave `parsed_data` empty — you can tap "Parse with AI" in the app if you want the RO#/agreement auto-filled, or I can run it now (optional).

## What you'll see afterward
- Hihanni Sica → DL62 shows **Part 1** (Active, original crew + 7/19–7/20 tickets + OF-286) and **Part 2** (Assigned, new RO attached, empty crew/tickets ready for the swap).
- Roll-up "Resource Orders" section on the incident lists both ROs, tagged by truck part.
- Payroll, OF-286, and the factoring schedule treat the two parts as independent line items.

## Not doing
- Not changing Part 1's status or crew.
- Not migrating any existing tickets/crew between parts.
- Not auto-parsing the RO unless you ask (fast follow if wanted).
