## What exists today vs. what you asked for

### What's already there
- **Crew can pick "Reimbursement" vs "Company"** when adding an expense (`ExpenseForm.tsx`). Type is stored on `expenses.expense_type`.
- **Admin can see it in the review queue** — `ExpenseReview.tsx` and `Expenses.tsx` show a "Reimb." chip on submitted expenses.
- **Admin can approve and mark "Reimbursed"** — `ExpenseDetail.tsx` flips status to `reimbursed`.
- The expense is **linked to the user who submitted it** via `expenses.submitted_by_user_id`.

### What's missing (the gaps you asked about)
1. **No "Accounts Payable" view.** Approved reimbursements that are owed-but-not-yet-paid have no dedicated screen. They just sit in the expenses list filtered by status.
2. **Paystubs do not include reimbursements.** `Paystub.tsx` and `aggregateCrewPayroll()` in `lib/payroll.ts` only handle wages, deductions, taxes — reimbursements are never added in.
3. **Payroll report (CSV/PDF/Excel) does not include reimbursements.** Same root cause — `payroll-report.ts` uses only the wage aggregator.
4. **P&L and reporting double-counts risk.** The P&L pulls **all** approved expenses regardless of type, but reimbursements aren't separated from company expenses, so you can't tell what's owed to crew vs. paid to vendors.
5. **No link from expense to crew_member.** Today reimbursements are linked by `submitted_by_user_id` (auth user), not `crew_member_id`. To roll into payroll cleanly we need to resolve user → crew member (the `profiles.crew_member_id` link already exists).

---

## Plan — 4 focused changes

### 1. Accounts Payable view (admin)
- Add a new admin screen **`/admin/accounts-payable`** (linked from More / Settings → Admin).
- Lists all expenses where `expense_type = 'reimbursement'` AND `status = 'approved'` (i.e., owed but not yet paid).
- Grouped by crew member with a running "Owed" total per person and a grand total at top.
- Row actions: "Mark Paid" (sets status to `reimbursed` and stamps `reimbursed_at`), "Mark Paid via Payroll" (same, but tags it for the paystub).
- Filter chips: Pending / Paid this period / All.

### 2. Paystub reimbursements section
- Extend `CrewPayrollLine` in `lib/payroll.ts` with:
  - `reimbursements: { id, date, vendor, category, amount }[]`
  - `reimbursementsTotal: number`
- In `aggregateCrewPayroll()`, fetch approved reimbursement expenses for the period whose submitting user maps to the crew member (via `profiles.crew_member_id`), and attach them to that line.
- Update `Paystub.tsx` to render a **"Reimbursements (non-taxable)"** section after the earnings table, then add it to net pay (separately from gross wages so it isn't taxed).
- Mark those expenses as `reimbursed` automatically when the payroll period is finalized (or via the AP "Pay via Payroll" action).

### 3. Payroll report rollup
- Update `services/reports/payroll-report.ts` to include a `Reimbursements` column per crew member and a totals row.
- CSV / PDF / Excel exporters get the new column.

### 4. P&L separation
- In `pl-report.ts`, split the per-incident expense column into:
  - **Vendor expenses** (`expense_type = 'company'`)
  - **Crew reimbursements** (`expense_type = 'reimbursement'`)
- Both still feed `totalCost`, but they're visible separately so you know how much of the cost is owed to crew.

---

## Database / technical notes
- Add nullable column `expenses.reimbursed_at timestamptz` (when actually paid out — distinct from `reviewed_at`).
- Add nullable column `expenses.paid_via_payroll_period text` so a paystub can show exactly which reimbursements it bundled.
- No new tables needed — AP is a derived view over `expenses`.
- User → crew member resolution uses the existing `profiles.crew_member_id` foreign key (no schema change).
- All changes RLS-safe (admin-only writes, org-scoped selects).

---

## What you'll be able to do after this
- Crew submits a reimbursement → admin sees it in **Expense Review** (today)
- Admin approves → it lands in **Accounts Payable** (new) showing what's owed and to whom
- Admin runs payroll → reimbursements appear on each crew member's **paystub** as a non-taxable line and are auto-marked paid
- **Payroll report** shows wages + reimbursements per person
- **P&L** shows vendor expenses and crew reimbursements as separate lines per incident
