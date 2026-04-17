
-- 1) Add columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'contractor',
  ADD COLUMN IF NOT EXISTS modules_enabled jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accepts_assignments boolean NOT NULL DEFAULT false;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_org_type_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type IN ('contractor','vfd','state_agency'));

-- 2) Add qualifications to crew_members
ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS qualifications jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Training records table
CREATE TABLE IF NOT EXISTS public.training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  crew_member_id uuid NOT NULL,
  course_name text NOT NULL,
  completed_at date,
  expires_at date,
  hours numeric,
  certificate_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tr_select ON public.training_records;
CREATE POLICY tr_select ON public.training_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS tr_insert ON public.training_records;
CREATE POLICY tr_insert ON public.training_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS tr_update ON public.training_records;
CREATE POLICY tr_update ON public.training_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS tr_delete ON public.training_records;
CREATE POLICY tr_delete ON public.training_records FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_training_records_org ON public.training_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_records_crew ON public.training_records(crew_member_id);

-- 4) Call responses table (VFD)
CREATE TABLE IF NOT EXISTS public.call_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  incident_id uuid NOT NULL,
  crew_member_id uuid NOT NULL,
  dispatched_at timestamptz,
  on_scene_at timestamptz,
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cr_select ON public.call_responses;
CREATE POLICY cr_select ON public.call_responses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS cr_insert ON public.call_responses;
CREATE POLICY cr_insert ON public.call_responses FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS cr_update ON public.call_responses;
CREATE POLICY cr_update ON public.call_responses FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS cr_delete ON public.call_responses;
CREATE POLICY cr_delete ON public.call_responses FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_call_responses_org ON public.call_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_incident ON public.call_responses(incident_id);

-- 5) Update create_organization_with_owner to accept org type
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(_name text, _org_type text DEFAULT 'contractor', _accepts_assignments boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _safe_type text;
BEGIN
  _safe_type := COALESCE(_org_type, 'contractor');
  IF _safe_type NOT IN ('contractor','vfd','state_agency') THEN
    _safe_type := 'contractor';
  END IF;

  INSERT INTO organizations (name, org_type, accepts_assignments)
    VALUES (_name, _safe_type, COALESCE(_accepts_assignments, false))
    RETURNING id INTO _org_id;
  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, auth.uid(), 'admin');
  RETURN _org_id;
END;
$function$;
