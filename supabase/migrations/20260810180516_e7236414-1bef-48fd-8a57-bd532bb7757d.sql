CREATE TABLE public.ibpa_training_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  crew_member_id uuid NOT NULL UNIQUE,
  crew_member_name text NOT NULL,
  recorded_role text,
  recorded_qualifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  role_confirmation jsonb NOT NULL DEFAULT '{}'::jsonb,
  agreement_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  courses jsonb NOT NULL DEFAULT '{}'::jsonb,
  unknown_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_review boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.ibpa_training_responses TO authenticated;
GRANT ALL ON public.ibpa_training_responses TO service_role;

ALTER TABLE public.ibpa_training_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view ibpa responses"
  ON public.ibpa_training_responses FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins update ibpa responses"
  ON public.ibpa_training_responses FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins delete ibpa responses"
  ON public.ibpa_training_responses FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER ibpa_training_responses_touch
  BEFORE UPDATE ON public.ibpa_training_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ibpa_collection_settings (
  organization_id uuid PRIMARY KEY,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ibpa_collection_settings TO authenticated;
GRANT ALL ON public.ibpa_collection_settings TO service_role;

ALTER TABLE public.ibpa_collection_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view ibpa settings"
  ON public.ibpa_collection_settings FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins insert ibpa settings"
  ON public.ibpa_collection_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins update ibpa settings"
  ON public.ibpa_collection_settings FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER ibpa_collection_settings_touch
  BEFORE UPDATE ON public.ibpa_collection_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ibpa_submit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ibpa_submit_log TO service_role;

ALTER TABLE public.ibpa_submit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX ibpa_submit_log_key_time ON public.ibpa_submit_log (client_key, created_at DESC);