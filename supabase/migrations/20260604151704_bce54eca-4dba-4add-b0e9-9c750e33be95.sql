-- Add per-document-type flags to finance contacts, backfill from role, and prevent duplicates
ALTER TABLE public.incident_truck_finance_contacts
  ADD COLUMN IF NOT EXISTS receives_shift_tickets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_demob boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_red_cards boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS receives_of286 boolean NOT NULL DEFAULT false;

-- Backfill flags from legacy role enum
UPDATE public.incident_truck_finance_contacts
SET receives_shift_tickets = (role IN ('shift_tickets','both')),
    receives_demob         = (role IN ('demob','both'));

-- Soft-delete duplicate finance officers per incident (incident-level scope), keep oldest active
WITH dupes_incident AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY incident_id, finance_officer_id
           ORDER BY selected_at ASC, created_at ASC
         ) AS rn
  FROM public.incident_truck_finance_contacts
  WHERE incident_truck_id IS NULL
    AND incident_id IS NOT NULL
    AND finance_officer_id IS NOT NULL
    AND is_active = true
)
UPDATE public.incident_truck_finance_contacts c
SET is_active = false, updated_at = now()
FROM dupes_incident d
WHERE c.id = d.id AND d.rn > 1;

-- Soft-delete duplicate finance officers per truck-scope
WITH dupes_truck AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY incident_truck_id, finance_officer_id
           ORDER BY selected_at ASC, created_at ASC
         ) AS rn
  FROM public.incident_truck_finance_contacts
  WHERE incident_truck_id IS NOT NULL
    AND finance_officer_id IS NOT NULL
    AND is_active = true
)
UPDATE public.incident_truck_finance_contacts c
SET is_active = false, updated_at = now()
FROM dupes_truck d
WHERE c.id = d.id AND d.rn > 1;

-- Partial unique indexes to prevent future duplicates (only for active rows with a finance_officer_id)
CREATE UNIQUE INDEX IF NOT EXISTS itfc_unique_incident_fo
  ON public.incident_truck_finance_contacts (incident_id, finance_officer_id)
  WHERE incident_truck_id IS NULL
    AND incident_id IS NOT NULL
    AND finance_officer_id IS NOT NULL
    AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS itfc_unique_truck_fo
  ON public.incident_truck_finance_contacts (incident_truck_id, finance_officer_id)
  WHERE incident_truck_id IS NOT NULL
    AND finance_officer_id IS NOT NULL
    AND is_active = true;