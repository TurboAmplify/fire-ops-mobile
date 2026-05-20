
-- Enable trigram first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- GACC regions -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gacc_regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  states text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gacc_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gacc_regions_select_all" ON public.gacc_regions
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.gacc_regions (id, name, states, sort_order) VALUES
  ('NWCC','Northwest Coordination Center',ARRAY['OR','WA'],1),
  ('NOCC','Northern California Coordination Center',ARRAY['CA'],2),
  ('OSCC','Southern California Coordination Center',ARRAY['CA'],3),
  ('NRCC','Northern Rockies Coordination Center',ARRAY['MT','ND','northern ID'],4),
  ('GBCC','Great Basin Coordination Center',ARRAY['ID','NV','UT','western WY'],5),
  ('RMCC','Rocky Mountain Coordination Center',ARRAY['CO','KS','NE','SD','WY'],6),
  ('SWCC','Southwest Coordination Center',ARRAY['AZ','NM','western TX','OK'],7),
  ('SACC','Southern Area Coordination Center',ARRAY['AL','AR','FL','GA','KY','LA','MS','NC','OK','SC','TN','TX','VA','PR'],8),
  ('EACC','Eastern Area Coordination Center',ARRAY['CT','DE','IA','IL','IN','MA','MD','ME','MI','MN','MO','NH','NJ','NY','OH','PA','RI','VT','WI','WV'],9),
  ('AKCC','Alaska Coordination Center',ARRAY['AK'],10)
ON CONFLICT (id) DO NOTHING;

-- ---------- finance_officers ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  dispatch_office text,
  region_id text REFERENCES public.gacc_regions(id) ON DELETE SET NULL,
  agency text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  last_used_at timestamptz,
  use_count int NOT NULL DEFAULT 0,
  created_by_user_id uuid,
  created_by_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_officers_email_chk CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT finance_officers_name_len CHECK (length(name) BETWEEN 1 AND 255)
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_officers_email_unique
  ON public.finance_officers (lower(email)) WHERE is_active;
CREATE INDEX IF NOT EXISTS finance_officers_region_idx
  ON public.finance_officers (region_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS finance_officers_name_trgm
  ON public.finance_officers USING gin (name gin_trgm_ops);

CREATE TRIGGER finance_officers_touch
  BEFORE UPDATE ON public.finance_officers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.finance_officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo_select_all" ON public.finance_officers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fo_insert_authenticated" ON public.finance_officers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "fo_update_creator_or_admin" ON public.finance_officers
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR created_by_user_id = auth.uid()
    OR (created_by_org_id IS NOT NULL AND public.is_org_admin(auth.uid(), created_by_org_id))
  );
CREATE POLICY "fo_delete_platform_admin" ON public.finance_officers
  FOR DELETE TO authenticated USING (public.is_platform_admin(auth.uid()));

-- ---------- finance_officer_audit ----------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_officer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_officer_id uuid NOT NULL REFERENCES public.finance_officers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_org_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS foa_officer_idx ON public.finance_officer_audit (finance_officer_id, occurred_at DESC);
ALTER TABLE public.finance_officer_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foa_select_all" ON public.finance_officer_audit
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "foa_insert_authenticated" ON public.finance_officer_audit
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- organizations.email_handle -----------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_handle text,
  ADD COLUMN IF NOT EXISTS email_handle_changed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_email_handle_unique
  ON public.organizations (lower(email_handle)) WHERE email_handle IS NOT NULL;
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_email_handle_chk;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_email_handle_chk
  CHECK (email_handle IS NULL OR email_handle ~ '^[a-z0-9][a-z0-9-]{2,30}$');

-- ---------- incidents.region_id + region_other ---------------------------
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS region_id text REFERENCES public.gacc_regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region_other text;
CREATE INDEX IF NOT EXISTS incidents_region_idx ON public.incidents (region_id);

-- ---------- incident_truck_finance_contacts ------------------------------
CREATE TABLE IF NOT EXISTS public.incident_truck_finance_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_truck_id uuid NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  finance_officer_id uuid REFERENCES public.finance_officers(id) ON DELETE SET NULL,
  name_override text,
  email_override text,
  phone_override text,
  role text NOT NULL DEFAULT 'both',
  selected_by_user_id uuid,
  selected_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itfc_role_chk CHECK (role IN ('shift_tickets','demob','both')),
  CONSTRAINT itfc_email_override_chk CHECK (
    email_override IS NULL OR email_override ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  CONSTRAINT itfc_has_contact CHECK (
    finance_officer_id IS NOT NULL OR email_override IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS itfc_truck_idx ON public.incident_truck_finance_contacts (incident_truck_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS itfc_officer_idx ON public.incident_truck_finance_contacts (finance_officer_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS itfc_org_idx ON public.incident_truck_finance_contacts (organization_id);

CREATE TRIGGER itfc_touch
  BEFORE UPDATE ON public.incident_truck_finance_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.incident_truck_finance_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itfc_select" ON public.incident_truck_finance_contacts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "itfc_insert" ON public.incident_truck_finance_contacts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "itfc_update" ON public.incident_truck_finance_contacts
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "itfc_delete" ON public.incident_truck_finance_contacts
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ---------- Helper: suggest_org_email_handle -----------------------------
CREATE OR REPLACE FUNCTION public.suggest_org_email_handle(_name text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE _slug text;
BEGIN
  _slug := lower(regexp_replace(coalesce(_name,''), '[^a-zA-Z0-9]+', '-', 'g'));
  _slug := regexp_replace(_slug, '^-+|-+$', '', 'g');
  IF length(_slug) < 3 THEN _slug := _slug || 'org'; END IF;
  IF length(_slug) > 31 THEN _slug := substring(_slug from 1 for 31); END IF;
  RETURN _slug;
END;
$$;
