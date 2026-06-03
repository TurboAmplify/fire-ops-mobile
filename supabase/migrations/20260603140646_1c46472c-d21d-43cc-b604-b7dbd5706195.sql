
-- 0) Drop the OLD role check first so the rename can land
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- 1) Role normalization
UPDATE public.organization_members SET role = 'crew_member' WHERE role IN ('crew','member');
UPDATE public.organization_members om
SET role = 'engine_boss'
WHERE om.role = 'crew_member'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.crew_members cm ON cm.id = p.crew_member_id
    WHERE p.id = om.user_id
      AND cm.organization_id = om.organization_id
      AND cm.role IN ('Engine Boss','Crew Boss')
  );

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('admin','engine_boss','crew_member'));

-- 2) Helper functions
CREATE OR REPLACE FUNCTION public.is_org_engine_boss(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = _user_id
        AND organization_id = _org_id
        AND role IN ('admin','engine_boss')
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- 3) Tighten write policies

-- incidents
DROP POLICY IF EXISTS incidents_insert ON public.incidents;
DROP POLICY IF EXISTS incidents_update ON public.incidents;
DROP POLICY IF EXISTS incidents_delete ON public.incidents;
CREATE POLICY incidents_insert ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY incidents_update ON public.incidents FOR UPDATE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), organization_id))
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY incidents_delete ON public.incidents FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- crew_members
DROP POLICY IF EXISTS crew_insert ON public.crew_members;
DROP POLICY IF EXISTS crew_update ON public.crew_members;
DROP POLICY IF EXISTS crew_delete ON public.crew_members;
CREATE POLICY crew_insert ON public.crew_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY crew_update ON public.crew_members FOR UPDATE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), organization_id))
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY crew_delete ON public.crew_members FOR DELETE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), organization_id));

-- incident_trucks
DROP POLICY IF EXISTS it_insert ON public.incident_trucks;
DROP POLICY IF EXISTS it_update ON public.incident_trucks;
DROP POLICY IF EXISTS it_delete ON public.incident_trucks;
CREATE POLICY it_insert ON public.incident_trucks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident(incident_id)));
CREATE POLICY it_update ON public.incident_trucks FOR UPDATE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(id)))
  WITH CHECK (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(id)));
CREATE POLICY it_delete ON public.incident_trucks FOR DELETE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(id)));

-- incident_truck_crew
DROP POLICY IF EXISTS itc_insert ON public.incident_truck_crew;
DROP POLICY IF EXISTS itc_update ON public.incident_truck_crew;
DROP POLICY IF EXISTS itc_delete ON public.incident_truck_crew;
CREATE POLICY itc_insert ON public.incident_truck_crew FOR INSERT TO authenticated
  WITH CHECK (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(incident_truck_id)));
CREATE POLICY itc_update ON public.incident_truck_crew FOR UPDATE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(incident_truck_id)))
  WITH CHECK (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(incident_truck_id)));
CREATE POLICY itc_delete ON public.incident_truck_crew FOR DELETE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), public.get_org_from_incident_truck(incident_truck_id)));

-- trucks
DROP POLICY IF EXISTS trucks_insert ON public.trucks;
DROP POLICY IF EXISTS trucks_update ON public.trucks;
DROP POLICY IF EXISTS trucks_delete ON public.trucks;
CREATE POLICY trucks_insert ON public.trucks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY trucks_update ON public.trucks FOR UPDATE TO authenticated
  USING (public.is_org_engine_boss(auth.uid(), organization_id))
  WITH CHECK (public.is_org_engine_boss(auth.uid(), organization_id));
CREATE POLICY trucks_delete ON public.trucks FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- expenses: crew_member sees/edits own only
DROP POLICY IF EXISTS expenses_select ON public.expenses;
DROP POLICY IF EXISTS expenses_insert ON public.expenses;
DROP POLICY IF EXISTS expenses_update ON public.expenses;
DROP POLICY IF EXISTS expenses_delete ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR submitted_by_user_id = auth.uid())
  );
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR submitted_by_user_id = auth.uid())
  );
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR submitted_by_user_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR submitted_by_user_id = auth.uid())
  );
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated
  USING (
    public.is_org_engine_boss(auth.uid(), organization_id)
    OR submitted_by_user_id = auth.uid()
  );

-- needs_list_items: edit/delete restricted to creator or engine_boss+
DROP POLICY IF EXISTS needs_update ON public.needs_list_items;
DROP POLICY IF EXISTS needs_delete ON public.needs_list_items;
CREATE POLICY needs_update ON public.needs_list_items FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR created_by_user_id = auth.uid())
  )
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY needs_delete ON public.needs_list_items FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (public.is_org_engine_boss(auth.uid(), organization_id) OR created_by_user_id = auth.uid())
  );
