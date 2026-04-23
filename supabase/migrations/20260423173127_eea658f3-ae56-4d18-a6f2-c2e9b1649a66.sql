-- Org-level payroll/withholding defaults
CREATE TABLE public.org_payroll_settings (
  organization_id uuid PRIMARY KEY,
  federal_pct numeric NOT NULL DEFAULT 10.00,
  social_security_pct numeric NOT NULL DEFAULT 6.20,
  medicare_pct numeric NOT NULL DEFAULT 1.45,
  state_pct numeric NOT NULL DEFAULT 0.00,
  state_enabled boolean NOT NULL DEFAULT false,
  extra_withholding_default numeric NOT NULL DEFAULT 0.00,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.org_payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ops_select_admin ON public.org_payroll_settings
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ops_insert_admin ON public.org_payroll_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ops_update_admin ON public.org_payroll_settings
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ops_delete_admin ON public.org_payroll_settings
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Per-employee withholding profile fields
ALTER TABLE public.crew_compensation
  ADD COLUMN filing_status text NOT NULL DEFAULT 'single',
  ADD COLUMN dependents_count integer NOT NULL DEFAULT 0,
  ADD COLUMN use_default_withholding boolean NOT NULL DEFAULT true,
  ADD COLUMN federal_pct_override numeric,
  ADD COLUMN extra_withholding numeric NOT NULL DEFAULT 0,
  ADD COLUMN state_pct_override numeric,
  ADD COLUMN social_security_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN medicare_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN other_deductions numeric NOT NULL DEFAULT 0,
  ADD COLUMN notes text;

ALTER TABLE public.crew_compensation
  ADD CONSTRAINT crew_compensation_filing_status_check
  CHECK (filing_status IN ('single', 'married_jointly'));