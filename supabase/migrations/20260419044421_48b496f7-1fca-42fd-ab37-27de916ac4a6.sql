-- Recent platform-wide activity feed (signups, org creations, invites accepted, incidents, shift tickets)
CREATE OR REPLACE FUNCTION public.admin_recent_activity(_days integer DEFAULT 7)
RETURNS TABLE(
  occurred_at timestamp with time zone,
  event_type text,
  title text,
  subtitle text,
  organization_id uuid,
  organization_name text,
  actor_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _since timestamp with time zone;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  _since := now() - make_interval(days => GREATEST(_days, 1));

  RETURN QUERY
  -- New user signups
  SELECT
    u.created_at AS occurred_at,
    'signup'::text AS event_type,
    COALESCE(p.full_name, u.email::text) AS title,
    'New user signed up'::text AS subtitle,
    NULL::uuid AS organization_id,
    NULL::text AS organization_name,
    u.email::text AS actor_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.created_at >= _since

  UNION ALL
  -- Organization created
  SELECT
    o.created_at,
    'org_created'::text,
    o.name,
    'Organization created'::text,
    o.id,
    o.name,
    NULL::text
  FROM organizations o
  WHERE o.created_at >= _since

  UNION ALL
  -- Invite accepted (member joined)
  SELECT
    m.created_at,
    'member_joined'::text,
    COALESCE(p.full_name, u.email::text),
    'Joined ' || o.name AS subtitle,
    o.id,
    o.name,
    u.email::text
  FROM organization_members m
  JOIN organizations o ON o.id = m.organization_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.created_at >= _since

  UNION ALL
  -- Incident created
  SELECT
    i.created_at,
    'incident_created'::text,
    i.name,
    'Incident in ' || o.name AS subtitle,
    o.id,
    o.name,
    NULL::text
  FROM incidents i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.created_at >= _since

  UNION ALL
  -- Shift ticket submitted (status moved off draft)
  SELECT
    st.updated_at,
    'shift_ticket_submitted'::text,
    COALESCE(st.incident_name, 'Shift ticket'),
    'Submitted in ' || o.name AS subtitle,
    o.id,
    o.name,
    NULL::text
  FROM shift_tickets st
  JOIN organizations o ON o.id = st.organization_id
  WHERE st.updated_at >= _since AND st.status <> 'draft'

  ORDER BY occurred_at DESC
  LIMIT 200;
END;
$$;

-- Cross-org user search for support
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  org_count bigint,
  organizations jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _q text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  _q := NULLIF(trim(_search), '');

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    (SELECT count(*) FROM organization_members m WHERE m.user_id = u.id) AS org_count,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'organization_id', o.id,
        'organization_name', o.name,
        'role', m.role,
        'joined_at', m.created_at
      ) ORDER BY m.created_at)
      FROM organization_members m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.user_id = u.id
    ), '[]'::jsonb) AS organizations
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE
    _q IS NULL
    OR u.email ILIKE '%' || _q || '%'
    OR COALESCE(p.full_name, '') ILIKE '%' || _q || '%'
  ORDER BY u.last_sign_in_at DESC NULLS LAST, u.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;