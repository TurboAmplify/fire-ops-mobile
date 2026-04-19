-- Allow admin_self_add_to_org / admin_self_remove_from_org to bypass the
-- platform-admin write guard on organization_members. The guard normally
-- blocks platform admins from writing to organizations they're not a member
-- of -- but these RPCs are the *intended* mechanism for joining one.

CREATE OR REPLACE FUNCTION public.guard_platform_admin_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _bypass text;
BEGIN
  -- Service-role / unauthenticated paths bypass (e.g., edge functions, RPCs)
  IF _uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only enforce for platform admins
  IF NOT public.is_platform_admin(_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Allow the dedicated self-add / self-remove RPCs through.
  BEGIN
    _bypass := current_setting('fireops.admin_self_membership_bypass', true);
  EXCEPTION WHEN others THEN
    _bypass := NULL;
  END;
  IF _bypass = 'on' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_self_add_to_org(_org_id uuid, _reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _member_id uuid;
  _existing_role text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_platform_admin(_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Tell the guard trigger to let this membership write through.
  PERFORM set_config('fireops.admin_self_membership_bypass', 'on', true);

  SELECT id, role INTO _member_id, _existing_role
  FROM organization_members
  WHERE organization_id = _org_id AND user_id = _uid
  LIMIT 1;

  IF _member_id IS NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, _uid, 'admin')
    RETURNING id INTO _member_id;
  ELSIF _existing_role <> 'admin' THEN
    UPDATE organization_members SET role = 'admin' WHERE id = _member_id;
  END IF;

  PERFORM set_config('fireops.admin_self_membership_bypass', 'off', true);

  INSERT INTO platform_admin_audit (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES (
    _uid,
    'self_add_to_org',
    'organization',
    _org_id,
    jsonb_build_object('member_id', _member_id, 'previous_role', _existing_role),
    _reason
  );

  RETURN _member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_self_remove_from_org(_org_id uuid, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _deleted_role text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_platform_admin(_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  PERFORM set_config('fireops.admin_self_membership_bypass', 'on', true);

  DELETE FROM organization_members
  WHERE organization_id = _org_id AND user_id = _uid
  RETURNING role INTO _deleted_role;

  PERFORM set_config('fireops.admin_self_membership_bypass', 'off', true);

  INSERT INTO platform_admin_audit (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES (
    _uid,
    'self_remove_from_org',
    'organization',
    _org_id,
    jsonb_build_object('removed_role', _deleted_role),
    _reason
  );
END;
$function$;