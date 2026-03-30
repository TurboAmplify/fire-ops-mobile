
-- Ensure users can create an organization and immediately read it during PostgREST insert+select flows.
-- This keeps existing org-scoped visibility intact while allowing the creator to see their freshly-created org.

DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT get_user_org_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
    )
  );
