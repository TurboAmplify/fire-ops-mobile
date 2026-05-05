-- 1) Tighten organizations SELECT: must be a real member, an invitee, or a platform admin.
DROP POLICY IF EXISTS org_select ON public.organizations;

CREATE POLICY org_select
ON public.organizations
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.organization_invites oi
    WHERE oi.organization_id = organizations.id
      AND oi.email = public.get_auth_email()
      AND oi.status = 'pending'
      AND oi.expires_at > now()
  )
);

-- 2) Hide platform admins' profiles from non–platform-admins (RESTRICTIVE = AND).
DROP POLICY IF EXISTS profiles_hide_platform_admins ON public.profiles;

CREATE POLICY profiles_hide_platform_admins
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- Either the profile is NOT a platform admin's, OR the viewer is the user
  -- themselves, OR the viewer is also a platform admin.
  NOT public.is_platform_admin(profiles.id)
  OR profiles.id = auth.uid()
  OR public.is_platform_admin(auth.uid())
);
