ALTER TABLE public.incident_truck_finance_contacts
  ALTER COLUMN incident_truck_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS incident_id uuid;

CREATE INDEX IF NOT EXISTS itfc_incident_id_idx
  ON public.incident_truck_finance_contacts(incident_id);