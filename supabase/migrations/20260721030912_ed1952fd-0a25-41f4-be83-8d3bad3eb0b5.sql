
ALTER TABLE public.incident_trucks
  ADD COLUMN IF NOT EXISTS part_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS part_label text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.incident_trucks
  DROP CONSTRAINT IF EXISTS incident_trucks_incident_id_truck_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS incident_trucks_incident_truck_part_active_key
  ON public.incident_trucks (incident_id, truck_id, part_number)
  WHERE deleted_at IS NULL;
