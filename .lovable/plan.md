

# Pay Adjustments inside the Shift Ticket — placement + visibility

## Where it goes
Move the section to **after the Signatures block, just before the audit trail / footer** in `ShiftTicketForm.tsx`. This makes it clear the adjustments are a post-script — they happen *after* the legal ticket is signed, and they don't alter the signed personnel hours.

## Visual indicator the ticket has additions

When one or more pay adjustments exist on a ticket, every admin-facing surface gets a clear marker:

1. **At the top of the shift ticket** (admin view only): a small amber chip beside the ticket title:
   ```text
   [ + Pay adjustments (3) ]
   ```
   Tapping the chip scrolls down to the post-script section.

2. **In the shift ticket list** (`ShiftTicketLog.tsx` and `ShiftTicketSection.tsx`): same chip on the row, admin-only.

3. **In the post-script section header**: amber background tint and a banner:
   > "Pay adjustments — payroll only. Not part of the signed OF-297."

4. **OF-297 PDF export**: nothing changes. The PDF stays clean — no chip, no adjustments line. The federal form is the legal record.

## The post-script section itself

Section header: **"Pay Adjustments (Admin / Payroll Only)"**, collapsed by default if empty, expanded if any exist.

```text
─── Pay Adjustments (Admin / Payroll Only) ──── [ + Add ]
Payroll only. Not shown on signed OF-297.

  Brandon Smith   +1.5 hrs   $43.10
    Memo: "Owner approved extra hr/shift for Coyote Flats"
                                                       [ × ]

  Nevaeh Jones    +1.5 hrs   $43.10
    Memo: "Owner approved extra hr/shift for Coyote Flats"
                                                       [ × ]

                              Adjustment Total  +$86.20
                          [ + Apply to all crew on shift ]
```

- **+ Add** opens the existing `AdjustmentSheet` with date + incident pre-filled from the ticket
- **+ Apply to all crew on shift** loops through `personnel_entries` and creates one adjustment per person with the same hours/amount + memo
- Each row shows the **memo** inline (not just on hover) so it's visible at a glance
- Delete (×) removes the single row; confirmation toast

## Memo carries everywhere
The memo (the `reason` field on `payroll_adjustments`) already flows through:
- **Payroll page** Adjustments section — already shows `"reason"` italicized
- **Paystub modal + PDF** — already renders each adjustment as its own line with the memo text
- **Audit log** — `payroll_adjustment_audit` already stores the memo in the payload

No backend or paystub changes needed. We're only adjusting **placement, the indicator chip, and the per-row memo display** on the ticket itself.

## Admin gating
- The whole post-script section is wrapped in an `isAdmin` check (org admin or platform admin via `useOrganization().isAdmin`)
- Crew users never see the chip, the section, or any hint that adjustments exist
- The OF-297 PDF export never includes them regardless of who exports

## Files touched
- `src/components/shift-tickets/PayAdjustmentsSection.tsx` (new) — the post-script section, includes header banner, list with inline memo, delete control, "+ Add", "+ Apply to all crew on shift"
- `src/components/shift-tickets/ShiftTicketForm.tsx` — render `<PayAdjustmentsSection>` **after** `<SignaturePicker>` block (admin-gated), and add the amber "+ Pay adjustments (n)" chip near the ticket title
- `src/components/payroll/AdjustmentSheet.tsx` — accept optional `prefillDate`, `prefillIncidentId`, `prefillCrewMemberId` props (no UI redesign, just pre-fill)
- `src/pages/ShiftTicketLog.tsx` + `src/components/shift-tickets/ShiftTicketSection.tsx` — admin-only chip on each row that has adjustments
- `src/hooks/usePayrollAdjustments.ts` — add a `useTicketAdjustments(incidentId, dateRange, crewMemberIds)` selector so the section only fetches the rows relevant to this ticket

## What stays unchanged
- `payroll_adjustments` and `payroll_adjustment_audit` tables — no schema change
- `src/lib/payroll.ts` aggregation — already folds adjustments into gross
- `Paystub.tsx` and `generatePaystubPdf.ts` — already render memos as line items
- `generateOF297Pdf.ts` — explicitly excludes adjustments (no change needed; it never read from `payroll_adjustments`)

## Technical notes
- The "did this ticket have adjustments?" lookup uses `incident_id` + the date range covered by the ticket's `personnel_entries` + the crew members on the ticket. Cheap query, admin-only RLS already enforces visibility.
- Chip count = number of adjustment rows tied to this ticket's scope, not dollars — keeps the chip narrow and glanceable.

