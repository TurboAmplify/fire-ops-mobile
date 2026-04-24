
## Recommendation: don't make a fake shift ticket — use a Payroll Adjustment

You already have a feature built exactly for this case: **Payroll Adjustments**. It's a separate pay line that flows into payroll/paystubs without polluting the OF-297 record. A 0000–0000 shift ticket would:

- Misrepresent the federal OF-297 (you'd be signing a form saying he worked 0 hours when the intent is to pay him for a day).
- Confuse future audits — there'd be a signed ticket on a day no truck rolled.
- Force you to add a fake equipment row and a fake personnel row.

### The right path for Les / Ashby / 4/1

1. Bottom nav → **Payroll**
2. Find Les Madsen's row → tap to expand → tap **Add Adjustment** (or use the `+` adjustment control on his line).
3. In the sheet:
   - **Incident:** Ashby
   - **Date:** 2025-04-01
   - **Type:** Extra Hours (e.g. 8) — or **Flat Amount** if he's a daily-rate guy or you want a fixed dollar figure
   - **Reason / Memo:** "Truck went down — paid for scheduled day on Ashby"
4. Save. It now shows on his next paystub as a separate line with the memo, and appears in the P&L / payroll reports.

This is admin-only, audited (`payroll_adjustment_audit` table records who created it and why), and never touches shift tickets.

---

## Two small UX improvements I'd like to make

These came out of your message — both are quick.

### 1. Add a "Pay without a shift ticket" shortcut on the Shift Tickets log

On the Shift Ticket log page, add a small secondary action: **"Pay crew without a ticket"** that opens the AdjustmentSheet pre-filled with date = today and an incident picker. This makes the right answer discoverable so future-you doesn't think "I'll just make a fake ticket".

### 2. Fix the "nothing below supervisor signature" gap you noticed

You're right — when there's no incident yet (creating from scratch) or you're on the Create route, the **Pay Adjustments** section is gated behind `isAdmin && incidentId`. On `/incidents/:id/trucks/:itId/shift-ticket/new` the incidentId IS present, so the section *should* render. Two things to verify and fix:

- The section currently only renders once the ticket has personnel entries it can match to crew records. Add an empty-state message: "Save the ticket first to add pay adjustments to crew on this shift" — so the section is always visible to admins below signature 34, never silently hidden.
- Make sure the section renders on the Create page too (not just Edit). Verify the gating and remove `incidentId` from the condition if the user is on a known incident route — fall back to a minimal "Adjustments require an incident" message otherwise.

Result: as an admin you'll always see a "Pay Adjustments" card under section 34, even on a fresh ticket, so you know the option exists.

---

## Files to touch (only the UX fixes — the Les/Ashby fix is just using existing UI)

- `src/components/shift-tickets/ShiftTicketForm.tsx` — relax the gate around `<PayAdjustmentsSection>` so admins always see it; show a hint when the ticket is unsaved or has no matched crew.
- `src/components/shift-tickets/PayAdjustmentsSection.tsx` — friendlier empty state when `crewOnTicket.length === 0` (currently only visible after tapping Add).
- `src/pages/ShiftTicketLog.tsx` — add a "Pay crew without a ticket" button that opens `AdjustmentSheet` directly (no shift ticket required).

No DB changes. No new tables. Pure UX surfacing of the adjustment flow you already have.

---

## Re: "shift ticket isn't downloading from Andrews"

Still unanswered from earlier — when you have a moment, let me know what happens when you tap Download (nothing? error toast? spinner?) and I'll dig in. Unrelated to this task.
