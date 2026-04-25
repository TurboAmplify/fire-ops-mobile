ALTER TABLE public.org_payroll_settings
ALTER COLUMN workers_comp_pct SET DEFAULT 16.00;

UPDATE public.org_payroll_settings
SET workers_comp_pct = 16.00
WHERE workers_comp_pct = 0.00;