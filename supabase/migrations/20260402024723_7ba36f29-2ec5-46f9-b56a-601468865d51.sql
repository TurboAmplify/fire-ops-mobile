CREATE POLICY "org_update"
ON public.organizations
FOR UPDATE
TO authenticated
USING (id IN (SELECT get_user_org_ids(auth.uid())))
WITH CHECK (id IN (SELECT get_user_org_ids(auth.uid())));