
-- 1. Restrict sensitive crew columns to admins via column-level grants
-- Create a function admins use to read full crew member rows
REVOKE SELECT (phone, hourly_rate, hw_rate) ON public.crew_members FROM authenticated;

-- Helper view exposing only admin-readable rows with pay+phone
CREATE OR REPLACE VIEW public.crew_members_sensitive
WITH (security_invoker = true) AS
SELECT id, organization_id, phone, hourly_rate, hw_rate
FROM public.crew_members
WHERE public.is_org_admin(auth.uid(), organization_id);

GRANT SELECT ON public.crew_members_sensitive TO authenticated;

-- 2. Audit log: strictly append-only via restrictive policies that always reject
CREATE POLICY "sta_no_update" ON public.shift_ticket_audit
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "sta_no_delete" ON public.shift_ticket_audit
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- 3. Tighten signature storage policies: require shift-ticket truck access too
DROP POLICY IF EXISTS "fireops_signatures_select" ON storage.objects;
DROP POLICY IF EXISTS "fireops_signatures_insert" ON storage.objects;
DROP POLICY IF EXISTS "fireops_signatures_update" ON storage.objects;
DROP POLICY IF EXISTS "fireops_signatures_delete" ON storage.objects;

CREATE POLICY "fireops_signatures_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.shift_tickets st
      JOIN public.incident_trucks it ON it.id = st.incident_truck_id
      WHERE st.id::text = split_part(storage.objects.name, '/', 1)
        AND st.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        AND public.user_can_access_truck(auth.uid(), it.truck_id)
    )
  );

CREATE POLICY "fireops_signatures_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.shift_tickets st
      JOIN public.incident_trucks it ON it.id = st.incident_truck_id
      WHERE st.id::text = split_part(storage.objects.name, '/', 1)
        AND st.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        AND public.user_can_access_truck(auth.uid(), it.truck_id)
    )
  );

CREATE POLICY "fireops_signatures_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.shift_tickets st
      JOIN public.incident_trucks it ON it.id = st.incident_truck_id
      WHERE st.id::text = split_part(storage.objects.name, '/', 1)
        AND st.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        AND public.user_can_access_truck(auth.uid(), it.truck_id)
    )
  );

CREATE POLICY "fireops_signatures_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.shift_tickets st
      JOIN public.incident_trucks it ON it.id = st.incident_truck_id
      WHERE st.id::text = split_part(storage.objects.name, '/', 1)
        AND st.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        AND public.user_can_access_truck(auth.uid(), it.truck_id)
    )
  );
