
ALTER TABLE public.finance_officers
  ADD COLUMN IF NOT EXISTS work_phone text,
  ADD COLUMN IF NOT EXISTS cell_phone text;

-- Backfill cell_phone from legacy phone column where empty
UPDATE public.finance_officers
SET cell_phone = phone
WHERE cell_phone IS NULL AND phone IS NOT NULL;

ALTER TABLE public.incident_truck_finance_contacts
  ADD COLUMN IF NOT EXISTS work_phone_override text,
  ADD COLUMN IF NOT EXISTS cell_phone_override text;

UPDATE public.incident_truck_finance_contacts
SET cell_phone_override = phone_override
WHERE cell_phone_override IS NULL AND phone_override IS NOT NULL;
