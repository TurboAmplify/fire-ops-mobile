
-- 0. Drop old check constraint(s) on role columns
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_invites DROP CONSTRAINT IF EXISTS organization_invites_role_check;

-- 1. Migrate role values
UPDATE public.organization_members
SET role = CASE
  WHEN role IN ('owner', 'admin') THEN 'admin'
  ELSE 'crew'
END;

UPDATE public.organization_invites
SET role = CASE
  WHEN role IN ('owner', 'admin') THEN 'admin'
  ELSE 'crew'
END;

-- Re-add constraints (only admin or crew allowed)
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check CHECK (role IN ('admin','crew'));
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_role_check CHECK (role IN ('admin','crew'));

-- 2. Add seat columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS seat_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';

-- 3. crew_truck_access table
CREATE TABLE IF NOT EXISTS public.crew_truck_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  truck_id uuid NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, truck_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_truck_access_user ON public.crew_truck_access(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_truck_access_truck ON public.crew_truck_access(truck_id);
CREATE INDEX IF NOT EXISTS idx_crew_truck_access_org ON public.crew_truck_access(organization_id);
ALTER TABLE public.crew_truck_access ENABLE ROW LEVEL SECURITY;

-- 4. Helpers
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_truck(_user_id uuid, _truck_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trucks t
    WHERE t.id = _truck_id
      AND (
        public.is_org_admin(_user_id, t.organization_id)
        OR EXISTS (
          SELECT 1 FROM crew_truck_access cta
          WHERE cta.user_id = _user_id AND cta.truck_id = _truck_id
        )
      )
  )
$$;

-- 5. crew_truck_access policies
DROP POLICY IF EXISTS cta_select ON public.crew_truck_access;
DROP POLICY IF EXISTS cta_insert ON public.crew_truck_access;
DROP POLICY IF EXISTS cta_update ON public.crew_truck_access;
DROP POLICY IF EXISTS cta_delete ON public.crew_truck_access;
CREATE POLICY cta_select ON public.crew_truck_access FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY cta_insert ON public.crew_truck_access FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY cta_update ON public.crew_truck_access FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY cta_delete ON public.crew_truck_access FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- 6. Truck-scoped RLS rewrites

-- TRUCKS
DROP POLICY IF EXISTS trucks_select ON public.trucks;
CREATE POLICY trucks_select ON public.trucks FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR EXISTS (SELECT 1 FROM crew_truck_access cta WHERE cta.user_id = auth.uid() AND cta.truck_id = trucks.id)
    )
  );
DROP POLICY IF EXISTS trucks_update ON public.trucks;
CREATE POLICY trucks_update ON public.trucks FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR EXISTS (SELECT 1 FROM crew_truck_access cta WHERE cta.user_id = auth.uid() AND cta.truck_id = trucks.id)
    )
  );
DROP POLICY IF EXISTS trucks_delete ON public.trucks;
CREATE POLICY trucks_delete ON public.trucks FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- INCIDENT_TRUCKS
DROP POLICY IF EXISTS it_select ON public.incident_trucks;
CREATE POLICY it_select ON public.incident_trucks FOR SELECT TO authenticated
  USING (
    get_org_from_incident_truck(id) IN (SELECT get_user_org_ids(auth.uid()))
    AND public.user_can_access_truck(auth.uid(), truck_id)
  );
DROP POLICY IF EXISTS it_insert ON public.incident_trucks;
CREATE POLICY it_insert ON public.incident_trucks FOR INSERT TO authenticated
  WITH CHECK (
    get_org_from_incident(incident_id) IN (SELECT get_user_org_ids(auth.uid()))
    AND public.user_can_access_truck(auth.uid(), truck_id)
  );
DROP POLICY IF EXISTS it_update ON public.incident_trucks;
CREATE POLICY it_update ON public.incident_trucks FOR UPDATE TO authenticated
  USING (
    get_org_from_incident_truck(id) IN (SELECT get_user_org_ids(auth.uid()))
    AND public.user_can_access_truck(auth.uid(), truck_id)
  );
DROP POLICY IF EXISTS it_delete ON public.incident_trucks;
CREATE POLICY it_delete ON public.incident_trucks FOR DELETE TO authenticated
  USING (
    get_org_from_incident_truck(id) IN (SELECT get_user_org_ids(auth.uid()))
    AND public.user_can_access_truck(auth.uid(), truck_id)
  );

-- INCIDENT_TRUCK_CREW
DROP POLICY IF EXISTS itc_select ON public.incident_truck_crew;
CREATE POLICY itc_select ON public.incident_truck_crew FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = incident_truck_crew.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS itc_insert ON public.incident_truck_crew;
CREATE POLICY itc_insert ON public.incident_truck_crew FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = incident_truck_crew.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS itc_update ON public.incident_truck_crew;
CREATE POLICY itc_update ON public.incident_truck_crew FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = incident_truck_crew.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS itc_delete ON public.incident_truck_crew;
CREATE POLICY itc_delete ON public.incident_truck_crew FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = incident_truck_crew.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));

-- SHIFTS
DROP POLICY IF EXISTS shifts_select ON public.shifts;
CREATE POLICY shifts_select ON public.shifts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shifts.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS shifts_insert ON public.shifts;
CREATE POLICY shifts_insert ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shifts.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS shifts_update ON public.shifts;
CREATE POLICY shifts_update ON public.shifts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shifts.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS shifts_delete ON public.shifts;
CREATE POLICY shifts_delete ON public.shifts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shifts.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));

-- SHIFT_CREW
DROP POLICY IF EXISTS sc_select ON public.shift_crew;
CREATE POLICY sc_select ON public.shift_crew FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM shifts s JOIN incident_trucks it ON it.id = s.incident_truck_id WHERE s.id = shift_crew.shift_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS sc_insert ON public.shift_crew;
CREATE POLICY sc_insert ON public.shift_crew FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM shifts s JOIN incident_trucks it ON it.id = s.incident_truck_id WHERE s.id = shift_crew.shift_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS sc_update ON public.shift_crew;
CREATE POLICY sc_update ON public.shift_crew FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM shifts s JOIN incident_trucks it ON it.id = s.incident_truck_id WHERE s.id = shift_crew.shift_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS sc_delete ON public.shift_crew;
CREATE POLICY sc_delete ON public.shift_crew FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM shifts s JOIN incident_trucks it ON it.id = s.incident_truck_id WHERE s.id = shift_crew.shift_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));

-- SHIFT_TICKETS
DROP POLICY IF EXISTS st_select ON public.shift_tickets;
CREATE POLICY st_select ON public.shift_tickets FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shift_tickets.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS st_insert ON public.shift_tickets;
CREATE POLICY st_insert ON public.shift_tickets FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shift_tickets.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS st_update ON public.shift_tickets;
CREATE POLICY st_update ON public.shift_tickets FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shift_tickets.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));
DROP POLICY IF EXISTS st_delete ON public.shift_tickets;
CREATE POLICY st_delete ON public.shift_tickets FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND EXISTS (SELECT 1 FROM incident_trucks it WHERE it.id = shift_tickets.incident_truck_id AND public.user_can_access_truck(auth.uid(), it.truck_id)));

-- TRUCK_INSPECTIONS
DROP POLICY IF EXISTS tinsp_select ON public.truck_inspections;
CREATE POLICY tinsp_select ON public.truck_inspections FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tinsp_insert ON public.truck_inspections;
CREATE POLICY tinsp_insert ON public.truck_inspections FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tinsp_update ON public.truck_inspections;
CREATE POLICY tinsp_update ON public.truck_inspections FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tinsp_delete ON public.truck_inspections;
CREATE POLICY tinsp_delete ON public.truck_inspections FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));

-- TRUCK_DOCUMENTS
DROP POLICY IF EXISTS td_select ON public.truck_documents;
CREATE POLICY td_select ON public.truck_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS td_insert ON public.truck_documents;
CREATE POLICY td_insert ON public.truck_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS td_update ON public.truck_documents;
CREATE POLICY td_update ON public.truck_documents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS td_delete ON public.truck_documents;
CREATE POLICY td_delete ON public.truck_documents FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));

-- TRUCK_PHOTOS
DROP POLICY IF EXISTS tp_select ON public.truck_photos;
CREATE POLICY tp_select ON public.truck_photos FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tp_insert ON public.truck_photos;
CREATE POLICY tp_insert ON public.truck_photos FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tp_update ON public.truck_photos;
CREATE POLICY tp_update ON public.truck_photos FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tp_delete ON public.truck_photos;
CREATE POLICY tp_delete ON public.truck_photos FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));

-- TRUCK_SERVICE_LOGS
DROP POLICY IF EXISTS sl_select ON public.truck_service_logs;
CREATE POLICY sl_select ON public.truck_service_logs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS sl_insert ON public.truck_service_logs;
CREATE POLICY sl_insert ON public.truck_service_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS sl_update ON public.truck_service_logs;
CREATE POLICY sl_update ON public.truck_service_logs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS sl_delete ON public.truck_service_logs;
CREATE POLICY sl_delete ON public.truck_service_logs FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));

-- TRUCK_CHECKLIST_ITEMS
DROP POLICY IF EXISTS tc_select ON public.truck_checklist_items;
CREATE POLICY tc_select ON public.truck_checklist_items FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tc_insert ON public.truck_checklist_items;
CREATE POLICY tc_insert ON public.truck_checklist_items FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tc_update ON public.truck_checklist_items;
CREATE POLICY tc_update ON public.truck_checklist_items FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));
DROP POLICY IF EXISTS tc_delete ON public.truck_checklist_items;
CREATE POLICY tc_delete ON public.truck_checklist_items FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())) AND public.user_can_access_truck(auth.uid(), truck_id));

-- 7. Update create_organization_with_owner to use 'admin' role
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  INSERT INTO organizations (name) VALUES (_name) RETURNING id INTO _org_id;
  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, auth.uid(), 'admin');
  RETURN _org_id;
END;
$$;

-- 8. Update auto_join_demo_org to use 'admin' role
CREATE OR REPLACE FUNCTION public.auto_join_demo_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001')
     AND NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = NEW.id) THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
