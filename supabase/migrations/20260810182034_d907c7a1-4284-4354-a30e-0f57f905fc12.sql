DO $$
BEGIN
  DROP POLICY IF EXISTS foa_select_all ON public.finance_officer_audit;
  DROP POLICY IF EXISTS fo_select_all ON public.finance_officers;

  CREATE POLICY "Org members can read finance officer audit"
  ON public.finance_officer_audit
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = finance_officer_audit.actor_org_id
  ));

  CREATE POLICY "Org members can read finance officers"
  ON public.finance_officers
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = finance_officers.created_by_org_id
  ));
END
$$;
