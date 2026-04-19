
-- Allow platform admins to read/write across all orgs via the same RLS helpers.
-- The UI scopes which org's data is shown; RLS just needs to permit it.

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM organization_members WHERE user_id = _user_id
  UNION
  SELECT id FROM organizations WHERE public.is_platform_admin(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
    )
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_truck(_user_id uuid, _truck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM trucks t
    WHERE t.id = _truck_id
      AND (
        public.is_platform_admin(_user_id)
        OR public.is_org_admin(_user_id, t.organization_id)
        OR EXISTS (
          SELECT 1 FROM crew_truck_access cta
          WHERE cta.user_id = _user_id AND cta.truck_id = _truck_id
        )
      )
  )
$function$;
