
-- Tighten org insert: any authenticated user can create (they must be logged in)
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten orgmem insert: user can only insert rows where user_id = their own id
DROP POLICY IF EXISTS "orgmem_insert" ON public.organization_members;
CREATE POLICY "orgmem_insert" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
