-- Resource orders table: belongs to incident_truck
CREATE TABLE public.resource_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_truck_id uuid NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  agreement_number text,
  resource_order_number text,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  parsed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select" ON public.resource_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.resource_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.resource_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.resource_orders FOR DELETE TO authenticated USING (true);

-- Agreements table: can be incident-level or truck-level
CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  incident_truck_id uuid REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  agreement_number text,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agreements_must_have_parent CHECK (incident_id IS NOT NULL OR incident_truck_id IS NOT NULL)
);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select" ON public.agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.agreements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.agreements FOR DELETE TO authenticated USING (true);

-- Storage buckets for resource orders and agreements
INSERT INTO storage.buckets (id, name, public) VALUES ('resource-orders', 'resource-orders', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', true);

-- Storage RLS policies
CREATE POLICY "Authenticated upload resource-orders" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resource-orders');
CREATE POLICY "Public read resource-orders" ON storage.objects FOR SELECT USING (bucket_id = 'resource-orders');
CREATE POLICY "Authenticated upload agreements" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agreements');
CREATE POLICY "Public read agreements" ON storage.objects FOR SELECT USING (bucket_id = 'agreements');

-- Enable realtime for resource_orders so parsed data updates appear live
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_orders;