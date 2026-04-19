-- 1. Replace delete_user_data so users can't accidentally wipe an org
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _is_admin boolean;
  _other_members int;
  _other_admins int;
  _has_data boolean;
BEGIN
  -- Pre-flight: refuse if the user is the sole admin of any org that still has
  -- members or operational data. They must transfer ownership first or the
  -- platform admin must delete the org.
  FOR _org_id IN
    SELECT organization_id FROM organization_members WHERE user_id = _user_id
  LOOP
    SELECT (role = 'admin') INTO _is_admin
    FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
    LIMIT 1;

    IF NOT _is_admin THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO _other_admins
    FROM organization_members
    WHERE organization_id = _org_id
      AND user_id <> _user_id
      AND role = 'admin';

    SELECT COUNT(*) INTO _other_members
    FROM organization_members
    WHERE organization_id = _org_id AND user_id <> _user_id;

    -- Other admins exist: this user can leave safely
    IF _other_admins > 0 THEN
      CONTINUE;
    END IF;

    -- Sole admin AND other (non-admin) members exist: must transfer ownership
    IF _other_members > 0 THEN
      RAISE EXCEPTION 'Cannot delete account: you are the only admin of an organization with % other member(s). Promote another admin or remove the other members first.', _other_members
        USING ERRCODE = 'P0001';
    END IF;

    -- Sole admin and no other members: check for operational data
    SELECT EXISTS (
      SELECT 1 FROM incidents WHERE organization_id = _org_id
      UNION ALL
      SELECT 1 FROM trucks WHERE organization_id = _org_id
      UNION ALL
      SELECT 1 FROM crew_members WHERE organization_id = _org_id
      UNION ALL
      SELECT 1 FROM expenses WHERE organization_id = _org_id
      UNION ALL
      SELECT 1 FROM shift_tickets WHERE organization_id = _org_id
    ) INTO _has_data;

    IF _has_data THEN
      RAISE EXCEPTION 'Cannot delete account: your organization still has operational records (incidents, trucks, crew, expenses, or shift tickets). Contact support to delete the organization.'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Pre-flight passed: now do the actual deletion. For each org where the user
  -- is the sole admin AND no other members AND no data, wipe the org.
  FOR _org_id IN
    SELECT organization_id FROM organization_members WHERE user_id = _user_id
  LOOP
    SELECT (role = 'admin') INTO _is_admin
    FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
    LIMIT 1;

    SELECT COUNT(*) INTO _other_members
    FROM organization_members
    WHERE organization_id = _org_id AND user_id <> _user_id;

    IF _is_admin AND _other_members = 0 THEN
      -- Empty org owned solely by this user: safe to delete
      DELETE FROM signature_audit_log WHERE organization_id = _org_id;
      DELETE FROM resource_orders WHERE organization_id = _org_id;
      DELETE FROM agreements WHERE organization_id = _org_id;
      DELETE FROM organization_invites WHERE organization_id = _org_id;
      DELETE FROM organization_members WHERE organization_id = _org_id;
      DELETE FROM organizations WHERE id = _org_id;
    ELSE
      DELETE FROM organization_members
      WHERE user_id = _user_id AND organization_id = _org_id;
    END IF;
  END LOOP;

  DELETE FROM profiles WHERE id = _user_id;
END;
$function$;

-- 2. Platform-admin-only RPC to permanently delete an organization (with audit)
CREATE OR REPLACE FUNCTION public.admin_delete_organization(_org_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_name text;
  _member_count int;
  _incident_count int;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
    RAISE EXCEPTION 'A deletion reason of at least 10 characters is required for the audit trail';
  END IF;

  SELECT name INTO _org_name FROM organizations WHERE id = _org_id;
  IF _org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT COUNT(*) INTO _member_count FROM organization_members WHERE organization_id = _org_id;
  SELECT COUNT(*) INTO _incident_count FROM incidents WHERE organization_id = _org_id;

  -- Audit BEFORE deletion so we keep the record
  INSERT INTO platform_admin_audit (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES (
    auth.uid(),
    'delete_organization',
    'organization',
    _org_id,
    jsonb_build_object(
      'organization_name', _org_name,
      'member_count', _member_count,
      'incident_count', _incident_count
    ),
    _reason
  );

  -- Cascade delete all org data (broad sweep)
  DELETE FROM signature_audit_log WHERE organization_id = _org_id;
  DELETE FROM shift_ticket_audit WHERE organization_id = _org_id;
  DELETE FROM shift_tickets WHERE organization_id = _org_id;
  DELETE FROM shift_crew WHERE shift_id IN (
    SELECT s.id FROM shifts s
    JOIN incident_trucks it ON it.id = s.incident_truck_id
    JOIN incidents i ON i.id = it.incident_id
    WHERE i.organization_id = _org_id
  );
  DELETE FROM shifts WHERE incident_truck_id IN (
    SELECT it.id FROM incident_trucks it
    JOIN incidents i ON i.id = it.incident_id
    WHERE i.organization_id = _org_id
  );
  DELETE FROM incident_truck_crew WHERE incident_truck_id IN (
    SELECT it.id FROM incident_trucks it
    JOIN incidents i ON i.id = it.incident_id
    WHERE i.organization_id = _org_id
  );
  DELETE FROM resource_orders WHERE organization_id = _org_id;
  DELETE FROM agreements WHERE organization_id = _org_id;
  DELETE FROM incident_trucks WHERE incident_id IN (
    SELECT id FROM incidents WHERE organization_id = _org_id
  );
  DELETE FROM call_responses WHERE organization_id = _org_id;
  DELETE FROM incidents WHERE organization_id = _org_id;
  DELETE FROM expenses WHERE organization_id = _org_id;
  DELETE FROM truck_inspection_results WHERE inspection_id IN (
    SELECT id FROM truck_inspections WHERE organization_id = _org_id
  );
  DELETE FROM truck_inspections WHERE organization_id = _org_id;
  DELETE FROM inspection_template_items WHERE template_id IN (
    SELECT id FROM inspection_templates WHERE organization_id = _org_id
  );
  DELETE FROM inspection_templates WHERE organization_id = _org_id;
  DELETE FROM truck_service_logs WHERE organization_id = _org_id;
  DELETE FROM truck_documents WHERE organization_id = _org_id;
  DELETE FROM truck_photos WHERE organization_id = _org_id;
  DELETE FROM truck_checklist_items WHERE organization_id = _org_id;
  DELETE FROM crew_truck_access WHERE organization_id = _org_id;
  DELETE FROM trucks WHERE organization_id = _org_id;
  DELETE FROM crew_compensation WHERE organization_id = _org_id;
  DELETE FROM crew_members WHERE organization_id = _org_id;
  DELETE FROM needs_list_items WHERE organization_id = _org_id;
  DELETE FROM training_records WHERE organization_id = _org_id;
  DELETE FROM organization_invites WHERE organization_id = _org_id;
  DELETE FROM organization_members WHERE organization_id = _org_id;
  DELETE FROM organizations WHERE id = _org_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_organization(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_organization(uuid, text) TO authenticated;