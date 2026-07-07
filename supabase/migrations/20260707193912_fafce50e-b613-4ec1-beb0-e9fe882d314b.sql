CREATE OR REPLACE FUNCTION public.user_can_manage_incident_truck_crew(_user_id uuid, _incident_truck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_org_engine_boss(_user_id, public.get_org_from_incident_truck(_incident_truck_id))
    OR EXISTS (
      SELECT 1
      FROM public.incident_trucks it
      WHERE it.id = _incident_truck_id
        AND public.user_can_access_truck(_user_id, it.truck_id)
    )
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS itc_insert ON public.incident_truck_crew;
DROP POLICY IF EXISTS itc_update ON public.incident_truck_crew;
DROP POLICY IF EXISTS itc_delete ON public.incident_truck_crew;

CREATE POLICY itc_insert ON public.incident_truck_crew
FOR INSERT TO authenticated
WITH CHECK (public.user_can_manage_incident_truck_crew(auth.uid(), incident_truck_id));

CREATE POLICY itc_update ON public.incident_truck_crew
FOR UPDATE TO authenticated
USING (public.user_can_manage_incident_truck_crew(auth.uid(), incident_truck_id))
WITH CHECK (public.user_can_manage_incident_truck_crew(auth.uid(), incident_truck_id));

CREATE POLICY itc_delete ON public.incident_truck_crew
FOR DELETE TO authenticated
USING (public.user_can_manage_incident_truck_crew(auth.uid(), incident_truck_id));

UPDATE public.incident_truck_crew
SET is_active = false,
    released_at = COALESCE(released_at, now())
WHERE id IN (
  'ef4cd090-ef33-4450-a1de-8ac73ebb32aa',
  '784a7427-c4e3-4c8c-912e-2e53f4177d02'
)
  AND incident_truck_id = 'c659405f-70d2-4aa4-8426-6ac8df8247a6';