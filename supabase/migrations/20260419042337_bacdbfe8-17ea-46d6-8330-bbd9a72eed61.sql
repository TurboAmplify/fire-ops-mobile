
-- =========================================================================
-- 1. Move pay rates to a separate admin-only table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.crew_compensation (
  crew_member_id uuid PRIMARY KEY REFERENCES public.crew_members(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hourly_rate numeric,
  hw_rate numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crew_compensation_org_idx ON public.crew_compensation(organization_id);

ALTER TABLE public.crew_compensation ENABLE ROW LEVEL SECURITY;

-- Only admins of the org can read or write
CREATE POLICY "cc_select_admin"
  ON public.crew_compensation FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "cc_insert_admin"
  ON public.crew_compensation FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "cc_update_admin"
  ON public.crew_compensation FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "cc_delete_admin"
  ON public.crew_compensation FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Backfill existing data
INSERT INTO public.crew_compensation (crew_member_id, organization_id, hourly_rate, hw_rate)
SELECT id, organization_id, hourly_rate, hw_rate
FROM public.crew_members
WHERE organization_id IS NOT NULL
  AND (hourly_rate IS NOT NULL OR hw_rate IS NOT NULL)
ON CONFLICT (crew_member_id) DO UPDATE
  SET hourly_rate = EXCLUDED.hourly_rate,
      hw_rate = EXCLUDED.hw_rate,
      updated_at = now();

-- Drop the old guard trigger; the columns are going away
DROP TRIGGER IF EXISTS crew_members_guard_writes ON public.crew_members;
DROP FUNCTION IF EXISTS public.crew_members_guard_sensitive_writes();

-- Remove the sensitive columns from crew_members entirely
ALTER TABLE public.crew_members DROP COLUMN IF EXISTS hourly_rate;
ALTER TABLE public.crew_members DROP COLUMN IF EXISTS hw_rate;

-- =========================================================================
-- 2. Restrict invite SELECT to admins or invited email
-- =========================================================================

DROP POLICY IF EXISTS orginv_select ON public.organization_invites;

CREATE POLICY "orginv_select"
  ON public.organization_invites FOR SELECT TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR email = public.get_auth_email()
  );

-- =========================================================================
-- 3. Validate inspection-photo storage paths: <truck_id>/<inspection_id>/...
-- =========================================================================

CREATE OR REPLACE FUNCTION public.validate_inspection_photo_path(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _truck_part text;
  _insp_part text;
  _truck_id uuid;
  _insp_id uuid;
BEGIN
  _truck_part := split_part(_path, '/', 1);
  _insp_part := split_part(_path, '/', 2);

  IF _truck_part = '' OR _insp_part = '' THEN
    RETURN false;
  END IF;
  IF _truck_part !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN false;
  END IF;
  IF _insp_part !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN false;
  END IF;

  _truck_id := _truck_part::uuid;
  _insp_id := _insp_part::uuid;

  -- Inspection must exist and belong to the same truck
  IF NOT EXISTS (
    SELECT 1 FROM truck_inspections ti
    WHERE ti.id = _insp_id AND ti.truck_id = _truck_id
  ) THEN
    RETURN false;
  END IF;

  -- User must have access to that truck
  RETURN public.user_can_access_truck(_user_id, _truck_id);
END;
$$;

-- Replace the existing storage policies for the inspection-photos bucket
DROP POLICY IF EXISTS "fireops_inspection_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "fireops_inspection_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "fireops_inspection_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "fireops_inspection_photos_delete" ON storage.objects;

CREATE POLICY "fireops_inspection_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND public.validate_inspection_photo_path(name, auth.uid())
  );

CREATE POLICY "fireops_inspection_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND public.validate_inspection_photo_path(name, auth.uid())
  );

CREATE POLICY "fireops_inspection_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND public.validate_inspection_photo_path(name, auth.uid())
  );

CREATE POLICY "fireops_inspection_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND public.validate_inspection_photo_path(name, auth.uid())
  );
