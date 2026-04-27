
CREATE TABLE IF NOT EXISTS public.org_role_default_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  role text NOT NULL,
  pay_method text NOT NULL DEFAULT 'hourly',
  hourly_rate numeric,
  hw_rate numeric,
  daily_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role)
);

ALTER TABLE public.org_role_default_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordr_select_admin ON public.org_role_default_rates
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ordr_insert_admin ON public.org_role_default_rates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ordr_update_admin ON public.org_role_default_rates
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ordr_delete_admin ON public.org_role_default_rates
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ordr_updated_at
BEFORE UPDATE ON public.org_role_default_rates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.crew_compensation
  ADD COLUMN IF NOT EXISTS use_org_default_rate boolean NOT NULL DEFAULT true;

INSERT INTO public.org_role_default_rates
  (organization_id, role, pay_method, hourly_rate, hw_rate, daily_rate)
VALUES
  ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'Engine Boss', 'daily',  28.73, 4.93, 1000),
  ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'Crew Boss',   'hourly', 28.73, 4.93, NULL),
  ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'Engineer',    'hourly', 28.73, 4.93, NULL),
  ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'FF 1',        'hourly', 28.73, 4.93, NULL),
  ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'FF 2',        'hourly', 28.73, 4.93, NULL)
ON CONFLICT (organization_id, role) DO NOTHING;

INSERT INTO public.crew_compensation
  (crew_member_id, organization_id, use_org_default_rate)
SELECT cm.id, cm.organization_id, true
FROM public.crew_members cm
LEFT JOIN public.crew_compensation cc ON cc.crew_member_id = cm.id
WHERE cc.crew_member_id IS NULL
  AND cm.organization_id IS NOT NULL
ON CONFLICT (crew_member_id) DO NOTHING;
