
-- 1. SECURITY DEFINER function to safely get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- 2. Fix organization_invites SELECT policy (remove direct auth.users reference)
DROP POLICY IF EXISTS orginv_select ON public.organization_invites;
CREATE POLICY orginv_select ON public.organization_invites
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    OR email = public.get_auth_email()
  );

-- 3. Fix organization_invites UPDATE policy
DROP POLICY IF EXISTS orginv_update ON public.organization_invites;
CREATE POLICY orginv_update ON public.organization_invites
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    OR email = public.get_auth_email()
  );

-- 4. Atomic function to create org + owner membership in one call
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  INSERT INTO organizations (name) VALUES (_name) RETURNING id INTO _org_id;
  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, auth.uid(), 'owner');
  RETURN _org_id;
END;
$$;
