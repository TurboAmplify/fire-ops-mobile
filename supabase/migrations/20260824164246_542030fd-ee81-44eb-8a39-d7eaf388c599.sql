CREATE TABLE public.personnel_evals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  crew_member_id uuid REFERENCES public.crew_members(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'internal',
  status text NOT NULL DEFAULT 'draft',
  public_token text UNIQUE,
  token_expires_at timestamptz,
  subject_name text,
  subject_home_unit text,
  fire_name text,
  fire_number text,
  fire_location text,
  fire_position text,
  assignment_from date,
  assignment_to date,
  acres_burned text,
  fuel_types text,
  work_category text,
  work_category_other text,
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  other_factor_label text,
  remarks text,
  employee_signature_url text,
  employee_signed_at timestamptz,
  employee_signed_date date,
  rater_name text,
  rater_home_unit text,
  rater_position text,
  rater_signature_url text,
  rater_signed_at timestamptz,
  rater_signed_date date,
  created_by_user_id uuid,
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel_evals TO authenticated;
GRANT ALL ON public.personnel_evals TO service_role;

ALTER TABLE public.personnel_evals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evals"
ON public.personnel_evals FOR SELECT TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can create evals"
ON public.personnel_evals FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Rater or admin can update evals"
ON public.personnel_evals FOR UPDATE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND (created_by_user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id))
)
WITH CHECK (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Rater or admin can delete evals"
ON public.personnel_evals FOR DELETE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND (created_by_user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id))
);

CREATE INDEX personnel_evals_org_idx ON public.personnel_evals (organization_id, created_at DESC);
CREATE INDEX personnel_evals_crew_idx ON public.personnel_evals (crew_member_id);
CREATE INDEX personnel_evals_incident_idx ON public.personnel_evals (incident_id);

CREATE TRIGGER personnel_evals_touch_updated_at
BEFORE UPDATE ON public.personnel_evals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();