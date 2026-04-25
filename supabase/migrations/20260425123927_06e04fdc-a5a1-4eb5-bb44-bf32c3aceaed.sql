ALTER TABLE public.org_payroll_settings
ADD COLUMN IF NOT EXISTS workers_comp_pct numeric NOT NULL DEFAULT 0.00;