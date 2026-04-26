-- 1. Operation type on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS operation_type text NOT NULL DEFAULT 'engine';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_operation_type_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_operation_type_check
  CHECK (operation_type IN ('engine', 'hand_crew', 'both'));

-- 2. Crews table (hand crews as a unit)
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  crew_type text NOT NULL DEFAULT 'hand_crew',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crews_organization ON public.crews(organization_id);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crews_select ON public.crews;
CREATE POLICY crews_select ON public.crews
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS crews_insert ON public.crews;
CREATE POLICY crews_insert ON public.crews
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS crews_update ON public.crews;
CREATE POLICY crews_update ON public.crews
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS crews_delete ON public.crews;
CREATE POLICY crews_delete ON public.crews
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- 3. Optional grouping: crew_members.crew_id
ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS crew_id uuid;

CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON public.crew_members(crew_id);

-- When a crew is deleted, leave the members in place but unlink them.
-- We can't add a real FK with ON DELETE SET NULL across schemas without
-- breaking existing data, so handle it with a trigger.
CREATE OR REPLACE FUNCTION public.crews_unlink_members_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.crew_members SET crew_id = NULL WHERE crew_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_crews_unlink_members ON public.crews;
CREATE TRIGGER trg_crews_unlink_members
  BEFORE DELETE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.crews_unlink_members_before_delete();

-- 4. incident_crews join table
CREATE TABLE IF NOT EXISTS public.incident_crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  crew_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  notes text,
  CONSTRAINT incident_crews_unique UNIQUE (incident_id, crew_id),
  CONSTRAINT incident_crews_status_check CHECK (status IN ('assigned','active','demobed','completed'))
);

CREATE INDEX IF NOT EXISTS idx_incident_crews_incident ON public.incident_crews(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_crews_crew ON public.incident_crews(crew_id);

ALTER TABLE public.incident_crews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ic_select ON public.incident_crews;
CREATE POLICY ic_select ON public.incident_crews
  FOR SELECT TO authenticated
  USING (public.get_org_from_incident(incident_id) IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS ic_insert ON public.incident_crews;
CREATE POLICY ic_insert ON public.incident_crews
  FOR INSERT TO authenticated
  WITH CHECK (public.get_org_from_incident(incident_id) IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS ic_update ON public.incident_crews;
CREATE POLICY ic_update ON public.incident_crews
  FOR UPDATE TO authenticated
  USING (public.get_org_from_incident(incident_id) IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS ic_delete ON public.incident_crews;
CREATE POLICY ic_delete ON public.incident_crews
  FOR DELETE TO authenticated
  USING (public.get_org_from_incident(incident_id) IN (SELECT public.get_user_org_ids(auth.uid())));