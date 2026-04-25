ALTER TABLE public.org_payroll_settings
  ADD COLUMN IF NOT EXISTS factoring_pct numeric NOT NULL DEFAULT 4.50,
  ADD COLUMN IF NOT EXISTS factoring_enabled boolean NOT NULL DEFAULT true;