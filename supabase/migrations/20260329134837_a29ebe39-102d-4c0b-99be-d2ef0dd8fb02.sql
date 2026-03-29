
-- 1. incident_truck_crew: add released_at, is_active, notes
ALTER TABLE public.incident_truck_crew
  ADD COLUMN released_at TIMESTAMPTZ,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notes TEXT;

-- 2. incident_trucks: add status with check constraint
ALTER TABLE public.incident_trucks
  ADD COLUMN status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'active', 'demobed', 'completed'));

-- 3. expenses: add incident_id, make incident_truck_id nullable
ALTER TABLE public.expenses
  ADD COLUMN incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
  ALTER COLUMN incident_truck_id DROP NOT NULL;

CREATE INDEX idx_expenses_incident ON public.expenses(incident_id);
