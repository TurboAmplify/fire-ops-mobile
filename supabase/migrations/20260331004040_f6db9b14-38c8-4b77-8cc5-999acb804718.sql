
CREATE TABLE public.needs_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  notes text,
  category text NOT NULL DEFAULT 'organization',
  crew_member_id uuid REFERENCES public.crew_members(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  is_purchased boolean NOT NULL DEFAULT false,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid
);

ALTER TABLE public.needs_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "needs_select" ON public.needs_list_items FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "needs_insert" ON public.needs_list_items FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "needs_update" ON public.needs_list_items FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "needs_delete" ON public.needs_list_items FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
