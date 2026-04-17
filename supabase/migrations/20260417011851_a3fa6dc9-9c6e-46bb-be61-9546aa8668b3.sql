
-- 1. Inspection templates (org-level)
CREATE TABLE public.inspection_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itpl_select" ON public.inspection_templates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpl_insert" ON public.inspection_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpl_update" ON public.inspection_templates FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpl_delete" ON public.inspection_templates FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 2. Inspection template items
CREATE TABLE public.inspection_template_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.inspection_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_template_items ENABLE ROW LEVEL SECURITY;

-- Helper to get org from template
CREATE OR REPLACE FUNCTION public.get_org_from_inspection_template(_template_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM inspection_templates WHERE id = _template_id $$;

CREATE POLICY "itpli_select" ON public.inspection_template_items FOR SELECT TO authenticated
  USING (get_org_from_inspection_template(template_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpli_insert" ON public.inspection_template_items FOR INSERT TO authenticated
  WITH CHECK (get_org_from_inspection_template(template_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpli_update" ON public.inspection_template_items FOR UPDATE TO authenticated
  USING (get_org_from_inspection_template(template_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "itpli_delete" ON public.inspection_template_items FOR DELETE TO authenticated
  USING (get_org_from_inspection_template(template_id) IN (SELECT get_user_org_ids(auth.uid())));

-- 3. Truck inspections (one row per completed walk-around)
CREATE TABLE public.truck_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  incident_id uuid,
  shift_id uuid,
  template_id uuid,
  performed_by_user_id uuid,
  performed_by_name text,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pass',
  notes text
);

ALTER TABLE public.truck_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tinsp_select" ON public.truck_inspections FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinsp_insert" ON public.truck_inspections FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinsp_update" ON public.truck_inspections FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinsp_delete" ON public.truck_inspections FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_truck_inspections_truck_perfat ON public.truck_inspections(truck_id, performed_at DESC);

-- 4. Truck inspection results (per-item)
CREATE TABLE public.truck_inspection_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id uuid NOT NULL REFERENCES public.truck_inspections(id) ON DELETE CASCADE,
  item_label text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  notes text,
  photo_url text
);

ALTER TABLE public.truck_inspection_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_org_from_truck_inspection(_inspection_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM truck_inspections WHERE id = _inspection_id $$;

CREATE POLICY "tinspr_select" ON public.truck_inspection_results FOR SELECT TO authenticated
  USING (get_org_from_truck_inspection(inspection_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinspr_insert" ON public.truck_inspection_results FOR INSERT TO authenticated
  WITH CHECK (get_org_from_truck_inspection(inspection_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinspr_update" ON public.truck_inspection_results FOR UPDATE TO authenticated
  USING (get_org_from_truck_inspection(inspection_id) IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "tinspr_delete" ON public.truck_inspection_results FOR DELETE TO authenticated
  USING (get_org_from_truck_inspection(inspection_id) IN (SELECT get_user_org_ids(auth.uid())));

-- 5. Schema additions
ALTER TABLE public.organizations
  ADD COLUMN inspection_alert_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.trucks
  ADD COLUMN inspection_template_id uuid;

-- 6. Migrate existing checklist items into a default template per org
DO $$
DECLARE
  _org RECORD;
  _new_template_id uuid;
BEGIN
  FOR _org IN
    SELECT DISTINCT organization_id
    FROM truck_checklist_items
    WHERE organization_id IS NOT NULL
  LOOP
    INSERT INTO inspection_templates (organization_id, name, is_default)
    VALUES (_org.organization_id, 'Walk-Around Inspection', true)
    RETURNING id INTO _new_template_id;

    INSERT INTO inspection_template_items (template_id, label, sort_order)
    SELECT _new_template_id, label, MIN(sort_order)
    FROM truck_checklist_items
    WHERE organization_id = _org.organization_id
    GROUP BY label
    ORDER BY MIN(sort_order);
  END LOOP;
END $$;

-- 7. Storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Inspection photos publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos');
CREATE POLICY "Authenticated can upload inspection photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');
CREATE POLICY "Authenticated can update inspection photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inspection-photos');
CREATE POLICY "Authenticated can delete inspection photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-photos');
