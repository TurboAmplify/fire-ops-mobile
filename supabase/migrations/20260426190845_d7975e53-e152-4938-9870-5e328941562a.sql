CREATE OR REPLACE FUNCTION public.list_org_members_with_identity(_org_id uuid)
RETURNS TABLE(member_id uuid, user_id uuid, role text, joined_at timestamp with time zone, email text, full_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = _org_id AND om.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.user_id AS user_id,
    m.role AS role,
    m.created_at AS joined_at,
    u.email::text AS email,
    p.full_name AS full_name
  FROM organization_members m
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.organization_id = _org_id
  ORDER BY m.created_at ASC;
END;
$function$;