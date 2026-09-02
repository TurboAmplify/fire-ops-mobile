CREATE TABLE public.gear_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  crew_member_id uuid NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  crew_member_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, crew_member_id)
);

GRANT SELECT, DELETE ON public.gear_survey_responses TO authenticated;
GRANT ALL ON public.gear_survey_responses TO service_role;

ALTER TABLE public.gear_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view gear survey responses"
  ON public.gear_survey_responses FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete gear survey responses"
  ON public.gear_survey_responses FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TABLE public.gear_survey_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.gear_survey_settings TO authenticated;
GRANT ALL ON public.gear_survey_settings TO service_role;

ALTER TABLE public.gear_survey_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view gear survey settings"
  ON public.gear_survey_settings FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage gear survey settings"
  ON public.gear_survey_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update gear survey settings"
  ON public.gear_survey_settings FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

INSERT INTO public.gear_survey_settings (organization_id, is_open)
VALUES ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', true);