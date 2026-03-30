
-- Service/maintenance log for trucks
CREATE TABLE public.truck_service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  service_type text NOT NULL DEFAULT 'other',
  description text,
  mileage integer,
  cost numeric,
  performed_at date NOT NULL DEFAULT CURRENT_DATE,
  performed_by text,
  next_due_at date,
  next_due_mileage integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_select" ON public.truck_service_logs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "sl_insert" ON public.truck_service_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "sl_update" ON public.truck_service_logs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY "sl_delete" ON public.truck_service_logs FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_truck_service_logs_truck ON public.truck_service_logs(truck_id);

-- Add caption column to truck_photos
ALTER TABLE public.truck_photos ADD COLUMN IF NOT EXISTS photo_label text;

-- Add mileage tracking to trucks
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS current_mileage integer;
