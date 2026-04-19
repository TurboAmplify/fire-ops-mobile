-- =========================================================================
-- Server-enforced read-only for platform admins on orgs they don't belong to
-- =========================================================================
-- A platform admin can READ all orgs (via existing get_user_org_ids union).
-- They can WRITE only to orgs where they have a real organization_members row.
-- Any other write attempt is blocked at the database layer, regardless of UI.
--
-- Maintenance/admin work that legitimately needs to bypass this guard must
-- go through SECURITY DEFINER admin_* RPCs that audit-log the action.

-- 1. Helper: is the calling user a "real" member of this org (NOT just platform admin)?
CREATE OR REPLACE FUNCTION public.is_real_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 2. Generic guard trigger: blocks writes by platform admins on foreign orgs.
-- Tables that have an organization_id column use this directly.
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  -- Service-role / unauthenticated paths bypass (e.g., edge functions, RPCs)
  IF _uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only enforce for platform admins
  IF NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Resolve the row's organization_id
  IF TG_OP = 'DELETE' THEN
    _org := OLD.organization_id;
  ELSE
    _org := NEW.organization_id;
  END IF;

  -- If the platform admin is also a real member of that org, allow the write
  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=%, op=%). Use admin_* RPCs for cross-org changes.',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$;

-- 3. Attach the guard to every org-scoped business table that has organization_id
DO $$
DECLARE
  _t text;
  _tables text[] := ARRAY[
    'agreements',
    'call_responses',
    'crew_compensation',
    'crew_members',
    'crew_truck_access',
    'expenses',
    'incidents',
    'inspection_templates',
    'needs_list_items',
    'organization_invites',
    'organization_members',
    'resource_orders',
    'shift_tickets',
    'signature_audit_log',
    'training_records',
    'truck_checklist_items',
    'truck_documents',
    'truck_inspections',
    'truck_photos',
    'truck_service_logs',
    'trucks'
  ];
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.%I',
      _t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_guard_platform_admin_write
         BEFORE INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write()',
      _t
    );
  END LOOP;
END;
$$;

-- 4. Special-case tables WITHOUT an organization_id column.
--    These derive org from a parent row, so we need bespoke guards.

-- incident_trucks: org via incidents.organization_id
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_incident_trucks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _it_row_id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    _org := public.get_org_from_incident_truck(OLD.id);
  ELSE
    _org := public.get_org_from_incident(NEW.incident_id);
  END IF;

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=incident_trucks, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.incident_trucks;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.incident_trucks
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_incident_trucks();

-- incident_truck_crew: org via incident_trucks -> incidents
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_itc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _org := public.get_org_from_incident_truck(COALESCE(NEW.incident_truck_id, OLD.incident_truck_id));

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=incident_truck_crew, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.incident_truck_crew;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.incident_truck_crew
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_itc();

-- shifts: org via incident_trucks
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_shifts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _org := public.get_org_from_incident_truck(COALESCE(NEW.incident_truck_id, OLD.incident_truck_id));

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=shifts, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.shifts;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_shifts();

-- shift_crew: org via shifts -> incident_trucks
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_shift_crew()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _org := public.get_org_from_shift(COALESCE(NEW.shift_id, OLD.shift_id));

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=shift_crew, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.shift_crew;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.shift_crew
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_shift_crew();

-- shift_ticket_audit: org column exists, but rows are append-only by design.
-- Existing sta_no_update/sta_no_delete already block mutations. Insert needs guard.
DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.shift_ticket_audit;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT ON public.shift_ticket_audit
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write();

-- inspection_template_items: org via inspection_templates
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_iti()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _org := public.get_org_from_inspection_template(COALESCE(NEW.template_id, OLD.template_id));

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=inspection_template_items, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.inspection_template_items;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.inspection_template_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_iti();

-- truck_inspection_results: org via truck_inspections
CREATE OR REPLACE FUNCTION public.guard_platform_admin_write_tir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _org := public.get_org_from_truck_inspection(COALESCE(NEW.inspection_id, OLD.inspection_id));

  IF _org IS NOT NULL AND public.is_real_org_member(_uid, _org) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Read-only: platform admins cannot modify data in organizations they do not belong to (table=truck_inspection_results, op=%).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_write ON public.truck_inspection_results;
CREATE TRIGGER trg_guard_platform_admin_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.truck_inspection_results
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write_tir();

-- 5. Tighten accept_invite_by_code error messages to reduce enumeration leakage
CREATE OR REPLACE FUNCTION public.accept_invite_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite organization_invites%ROWTYPE;
  _user_id uuid := auth.uid();
  _normalized text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  _normalized := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));

  -- Single generic error for unknown / used / expired to prevent enumeration
  SELECT * INTO _invite
  FROM organization_invites
  WHERE invite_code = _normalized
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  -- If user is already a member of this org, just mark accepted and return
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _invite.organization_id
  ) THEN
    UPDATE organization_invites SET status = 'accepted' WHERE id = _invite.id;
    RETURN _invite.organization_id;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_invite.organization_id, _user_id, _invite.role);

  UPDATE organization_invites SET status = 'accepted' WHERE id = _invite.id;

  RETURN _invite.organization_id;
END;
$$;

-- 6. Cap audit log payload size to prevent abuse / storage bloat
CREATE OR REPLACE FUNCTION public.platform_admin_audit_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.payload::text) > 8192 THEN
    RAISE EXCEPTION 'audit payload too large (max 8KB)';
  END IF;
  IF NEW.reason IS NOT NULL AND length(NEW.reason) > 1024 THEN
    RAISE EXCEPTION 'audit reason too long (max 1024 chars)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_admin_audit_validate ON public.platform_admin_audit;
CREATE TRIGGER trg_platform_admin_audit_validate
  BEFORE INSERT ON public.platform_admin_audit
  FOR EACH ROW EXECUTE FUNCTION public.platform_admin_audit_validate();