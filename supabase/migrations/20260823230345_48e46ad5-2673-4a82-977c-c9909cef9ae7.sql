ALTER TABLE public.payroll_payments
  ADD COLUMN IF NOT EXISTS incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS incident_name text;

ALTER TABLE public.payroll_payments
  DROP CONSTRAINT IF EXISTS payroll_payments_crew_member_id_period_start_period_end_key;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_payments_unique_run
  ON public.payroll_payments (crew_member_id, period_start, period_end, COALESCE(incident_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_payroll_payments_incident ON public.payroll_payments (incident_id);