
CREATE OR REPLACE FUNCTION public.get_org_from_incident(_incident_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id FROM incidents WHERE id = _incident_id
$$;

DROP POLICY "it_insert" ON public.incident_trucks;

CREATE POLICY "it_insert" ON public.incident_trucks
  FOR INSERT TO authenticated
  WITH CHECK (
    get_org_from_incident(incident_id) IN (SELECT get_user_org_ids(auth.uid()))
  );
