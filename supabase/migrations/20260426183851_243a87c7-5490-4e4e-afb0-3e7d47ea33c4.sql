CREATE OR REPLACE FUNCTION public.admin_get_organization(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org organizations%ROWTYPE;
  _members jsonb;
  _invites jsonb;
  _counts jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _org FROM organizations WHERE id = _org_id;
  IF _org.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'role', m.role,
    'joined_at', m.created_at,
    'email', u.email,
    'full_name', p.full_name,
    'last_sign_in_at', u.last_sign_in_at
  ) ORDER BY m.created_at), '[]'::jsonb)
  INTO _members
  FROM organization_members m
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.organization_id = _org_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'email', i.email,
    'role', i.role,
    'status', i.status,
    'created_at', i.created_at,
    'expires_at', i.expires_at
  ) ORDER BY i.created_at DESC), '[]'::jsonb)
  INTO _invites
  FROM organization_invites i
  WHERE i.organization_id = _org_id;

  SELECT jsonb_build_object(
    'incidents', (SELECT count(*) FROM incidents WHERE organization_id = _org_id),
    'active_incidents', (SELECT count(*) FROM incidents WHERE organization_id = _org_id AND status = 'active'),
    'trucks', (SELECT count(*) FROM trucks WHERE organization_id = _org_id),
    'crew_members', (SELECT count(*) FROM crew_members WHERE organization_id = _org_id),
    'shift_tickets', (SELECT count(*) FROM shift_tickets WHERE organization_id = _org_id),
    'expenses', (SELECT count(*) FROM expenses WHERE organization_id = _org_id),
    'expense_total', (SELECT COALESCE(sum(amount), 0) FROM expenses WHERE organization_id = _org_id)
  )
  INTO _counts;

  RETURN jsonb_build_object(
    'id', _org.id,
    'name', _org.name,
    'org_type', _org.org_type,
    'tier', _org.tier,
    'seat_limit', _org.seat_limit,
    'accepts_assignments', _org.accepts_assignments,
    'modules_enabled', _org.modules_enabled,
    'created_at', _org.created_at,
    'billing_status', _org.billing_status,
    'plan_code', _org.plan_code,
    'trial_ends_at', _org.trial_ends_at,
    'members', _members,
    'invites', _invites,
    'counts', _counts
  );
END;
$function$;