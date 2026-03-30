
-- =============================================
-- DROP OLD PERMISSIVE POLICIES
-- =============================================

-- organizations
DROP POLICY IF EXISTS "Authenticated select" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated insert" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated update" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated delete" ON public.organizations;

-- organization_members
DROP POLICY IF EXISTS "Authenticated select" ON public.organization_members;
DROP POLICY IF EXISTS "Authenticated insert" ON public.organization_members;
DROP POLICY IF EXISTS "Authenticated update" ON public.organization_members;
DROP POLICY IF EXISTS "Authenticated delete" ON public.organization_members;

-- organization_invites
DROP POLICY IF EXISTS "Authenticated select" ON public.organization_invites;
DROP POLICY IF EXISTS "Authenticated insert" ON public.organization_invites;
DROP POLICY IF EXISTS "Authenticated update" ON public.organization_invites;
DROP POLICY IF EXISTS "Authenticated delete" ON public.organization_invites;

-- profiles
DROP POLICY IF EXISTS "Authenticated select" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated update" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated delete" ON public.profiles;

-- incidents
DROP POLICY IF EXISTS "Authenticated select" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated insert" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated update" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated delete" ON public.incidents;

-- trucks
DROP POLICY IF EXISTS "Authenticated select" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated insert" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated update" ON public.trucks;
DROP POLICY IF EXISTS "Authenticated delete" ON public.trucks;

-- crew_members
DROP POLICY IF EXISTS "Authenticated select" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated insert" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated update" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated delete" ON public.crew_members;

-- expenses
DROP POLICY IF EXISTS "Authenticated select" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated insert" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated update" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated delete" ON public.expenses;

-- agreements
DROP POLICY IF EXISTS "Authenticated select" ON public.agreements;
DROP POLICY IF EXISTS "Authenticated insert" ON public.agreements;
DROP POLICY IF EXISTS "Authenticated update" ON public.agreements;
DROP POLICY IF EXISTS "Authenticated delete" ON public.agreements;

-- resource_orders
DROP POLICY IF EXISTS "Authenticated select" ON public.resource_orders;
DROP POLICY IF EXISTS "Authenticated insert" ON public.resource_orders;
DROP POLICY IF EXISTS "Authenticated update" ON public.resource_orders;
DROP POLICY IF EXISTS "Authenticated delete" ON public.resource_orders;

-- incident_trucks
DROP POLICY IF EXISTS "Authenticated select" ON public.incident_trucks;
DROP POLICY IF EXISTS "Authenticated insert" ON public.incident_trucks;
DROP POLICY IF EXISTS "Authenticated update" ON public.incident_trucks;
DROP POLICY IF EXISTS "Authenticated delete" ON public.incident_trucks;

-- incident_truck_crew
DROP POLICY IF EXISTS "Authenticated select" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Authenticated insert" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Authenticated update" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Authenticated delete" ON public.incident_truck_crew;

-- shifts
DROP POLICY IF EXISTS "Authenticated select" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated insert" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated update" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated delete" ON public.shifts;

-- shift_crew
DROP POLICY IF EXISTS "Authenticated select" ON public.shift_crew;
DROP POLICY IF EXISTS "Authenticated insert" ON public.shift_crew;
DROP POLICY IF EXISTS "Authenticated update" ON public.shift_crew;
DROP POLICY IF EXISTS "Authenticated delete" ON public.shift_crew;

-- =============================================
-- NEW ORG-SCOPED POLICIES
-- =============================================

-- ---- organizations ----
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---- organization_members ----
CREATE POLICY "orgmem_select" ON public.organization_members FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "orgmem_insert" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "orgmem_update" ON public.organization_members FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "orgmem_delete" ON public.organization_members FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- organization_invites ----
CREATE POLICY "orginv_select" ON public.organization_invites FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "orginv_insert" ON public.organization_invites FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "orginv_update" ON public.organization_invites FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "orginv_delete" ON public.organization_invites FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- profiles ----
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ---- incidents ----
CREATE POLICY "incidents_select" ON public.incidents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "incidents_delete" ON public.incidents FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- trucks ----
CREATE POLICY "trucks_select" ON public.trucks FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "trucks_insert" ON public.trucks FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "trucks_update" ON public.trucks FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "trucks_delete" ON public.trucks FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- crew_members ----
CREATE POLICY "crew_select" ON public.crew_members FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "crew_insert" ON public.crew_members FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "crew_update" ON public.crew_members FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "crew_delete" ON public.crew_members FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- expenses ----
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- agreements ----
CREATE POLICY "agreements_select" ON public.agreements FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "agreements_insert" ON public.agreements FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "agreements_update" ON public.agreements FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "agreements_delete" ON public.agreements FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- resource_orders ----
CREATE POLICY "ro_select" ON public.resource_orders FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "ro_insert" ON public.resource_orders FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "ro_update" ON public.resource_orders FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "ro_delete" ON public.resource_orders FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- incident_trucks (child table, scoped via incident) ----
CREATE POLICY "it_select" ON public.incident_trucks FOR SELECT TO authenticated
  USING (public.get_org_from_incident_truck(id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "it_insert" ON public.incident_trucks FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM incidents WHERE id = incident_id)
    IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "it_update" ON public.incident_trucks FOR UPDATE TO authenticated
  USING (public.get_org_from_incident_truck(id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "it_delete" ON public.incident_trucks FOR DELETE TO authenticated
  USING (public.get_org_from_incident_truck(id) IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- incident_truck_crew (child of incident_trucks) ----
CREATE POLICY "itc_select" ON public.incident_truck_crew FOR SELECT TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "itc_insert" ON public.incident_truck_crew FOR INSERT TO authenticated
  WITH CHECK (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "itc_update" ON public.incident_truck_crew FOR UPDATE TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "itc_delete" ON public.incident_truck_crew FOR DELETE TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- shifts (child of incident_trucks) ----
CREATE POLICY "shifts_select" ON public.shifts FOR SELECT TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "shifts_insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "shifts_update" ON public.shifts FOR UPDATE TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "shifts_delete" ON public.shifts FOR DELETE TO authenticated
  USING (public.get_org_from_incident_truck(incident_truck_id) IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---- shift_crew (grandchild: shift → incident_truck) ----
-- Need helper to resolve org from shift
CREATE OR REPLACE FUNCTION public.get_org_from_shift(_shift_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.get_org_from_incident_truck(s.incident_truck_id)
  FROM shifts s WHERE s.id = _shift_id
$$;

CREATE POLICY "sc_select" ON public.shift_crew FOR SELECT TO authenticated
  USING (public.get_org_from_shift(shift_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "sc_insert" ON public.shift_crew FOR INSERT TO authenticated
  WITH CHECK (public.get_org_from_shift(shift_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "sc_update" ON public.shift_crew FOR UPDATE TO authenticated
  USING (public.get_org_from_shift(shift_id) IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "sc_delete" ON public.shift_crew FOR DELETE TO authenticated
  USING (public.get_org_from_shift(shift_id) IN (SELECT public.get_user_org_ids(auth.uid())));
