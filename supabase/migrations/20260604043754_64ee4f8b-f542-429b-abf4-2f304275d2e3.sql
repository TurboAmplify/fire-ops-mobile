
-- 1) Soft-delete columns on incidents and incident_trucks
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE public.incident_trucks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS idx_incidents_deleted_at ON public.incidents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_incident_trucks_deleted_at ON public.incident_trucks(deleted_at);

-- 2) Helper: given an org + RO number, return any incident_truck already using it
CREATE OR REPLACE FUNCTION public.find_incident_truck_for_resource_order(
  _org_id uuid,
  _ro_number text
)
RETURNS TABLE (
  incident_truck_id uuid,
  incident_id uuid,
  incident_name text,
  truck_id uuid,
  resource_order_number text,
  resource_order_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    it.id AS incident_truck_id,
    it.incident_id,
    i.name AS incident_name,
    it.truck_id,
    ro.resource_order_number,
    ro.id AS resource_order_id
  FROM public.resource_orders ro
  JOIN public.incident_trucks it ON it.id = ro.incident_truck_id
  JOIN public.incidents i ON i.id = it.incident_id
  WHERE ro.organization_id = _org_id
    AND _ro_number IS NOT NULL
    AND trim(_ro_number) <> ''
    AND lower(trim(ro.resource_order_number)) = lower(trim(_ro_number))
    AND i.deleted_at IS NULL
  ORDER BY ro.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.find_incident_truck_for_resource_order(uuid, text) TO authenticated;
