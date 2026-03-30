
-- Add extended fields to trucks table
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS plate text,
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS water_capacity text,
  ADD COLUMN IF NOT EXISTS pump_type text,
  ADD COLUMN IF NOT EXISTS dot_number text;

-- Truck photos table
CREATE TABLE public.truck_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_select" ON public.truck_photos FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tp_insert" ON public.truck_photos FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tp_update" ON public.truck_photos FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tp_delete" ON public.truck_photos FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_truck_photos_truck ON public.truck_photos(truck_id);

-- Truck documents table
CREATE TABLE public.truck_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  title text,
  expires_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "td_select" ON public.truck_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "td_insert" ON public.truck_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "td_update" ON public.truck_documents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "td_delete" ON public.truck_documents FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_truck_documents_truck ON public.truck_documents(truck_id);

-- Truck checklist items table
CREATE TABLE public.truck_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  label text NOT NULL,
  is_complete boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tc_select" ON public.truck_checklist_items FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tc_insert" ON public.truck_checklist_items FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tc_update" ON public.truck_checklist_items FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tc_delete" ON public.truck_checklist_items FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_truck_checklist_truck ON public.truck_checklist_items(truck_id);

-- Storage buckets for truck files
INSERT INTO storage.buckets (id, name, public) VALUES ('truck-photos', 'truck-photos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('truck-documents', 'truck-documents', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS for truck-photos
CREATE POLICY "tp_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'truck-photos');
CREATE POLICY "tp_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'truck-photos');
CREATE POLICY "tp_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'truck-photos');

-- Storage RLS for truck-documents
CREATE POLICY "td_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'truck-documents');
CREATE POLICY "td_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'truck-documents');
CREATE POLICY "td_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'truck-documents');
