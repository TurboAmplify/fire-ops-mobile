ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS reimbursed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_via_payroll_period text;

CREATE INDEX IF NOT EXISTS idx_expenses_reimbursement_lookup
  ON public.expenses (organization_id, expense_type, status)
  WHERE expense_type = 'reimbursement';