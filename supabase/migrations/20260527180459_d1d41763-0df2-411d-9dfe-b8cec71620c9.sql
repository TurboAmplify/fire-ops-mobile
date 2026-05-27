
-- 1. Table
CREATE TABLE public.red_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  crew_member_id uuid NOT NULL UNIQUE REFERENCES public.crew_members(id) ON DELETE CASCADE,

  -- identity
  card_id text,
  agency text,
  primary_position text,
  photo_url text,

  -- fitness
  work_capacity_test text,
  fitness_test_date date,
  rt130_refresher_status text,

  -- dates
  issue_date date,
  review_expiration_date date,

  -- signer
  signer_name text,
  signer_title text,

  -- qualifications  [{qualification, code, status}]
  qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- notes
  restrictions_notes text,

  -- emergency contact
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,

  -- return-to
  return_address text,

  -- source
  source_document_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_red_cards_org ON public.red_cards(organization_id);
CREATE INDEX idx_red_cards_crew_member ON public.red_cards(crew_member_id);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.red_cards TO authenticated;
GRANT ALL ON public.red_cards TO service_role;

-- 3. RLS
ALTER TABLE public.red_cards ENABLE ROW LEVEL SECURITY;

-- Admin / platform admin full access
CREATE POLICY "Org admins manage red cards"
ON public.red_cards
FOR ALL
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Crew member can view their own red card
CREATE POLICY "Crew member views own red card"
ON public.red_cards
FOR SELECT
TO authenticated
USING (crew_member_id = public.get_user_crew_member_id(auth.uid()));

-- Other members of the same org can view (so crew bosses can see their team's cards)
CREATE POLICY "Org members view red cards"
ON public.red_cards
FOR SELECT
TO authenticated
USING (public.is_real_org_member(auth.uid(), organization_id));

-- 4. updated_at trigger
CREATE TRIGGER trg_red_cards_touch
BEFORE UPDATE ON public.red_cards
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Platform admin write guard (consistent with other org-scoped tables)
CREATE TRIGGER trg_red_cards_guard_platform_admin
BEFORE INSERT OR UPDATE OR DELETE ON public.red_cards
FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_write();

-- 6. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('red-cards', 'red-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: files keyed by <organization_id>/<crew_member_id>/...
CREATE POLICY "Org members read red-card files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'red-cards'
  AND public.is_real_org_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "Org admins upload red-card files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'red-cards'
  AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "Org admins update red-card files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'red-cards'
  AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "Org admins delete red-card files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'red-cards'
  AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
);
