-- Self-add: platform admin becomes a real admin member of an org, fully audited
CREATE OR REPLACE FUNCTION public.admin_self_add_to_org(_org_id uuid, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Self-remove: platform admin removes their own membership from an org, fully audited
CREATE OR REPLACE FUNCTION public.admin_self_remove_from_org(_org_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  DELETE FROM organization_members
  WHERE organization_id = _org_id AND user_id = _uid
  RETURNING role INTO _deleted_role;

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
$$;

GRANT EXECUTE ON FUNCTION public.admin_self_add_to_org(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_self_remove_from_org(uuid, text) TO authenticated;