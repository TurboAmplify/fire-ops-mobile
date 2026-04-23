ALTER TABLE public.crew_compensation
  ADD COLUMN IF NOT EXISTS pay_method text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS daily_rate numeric;

ALTER TABLE public.crew_compensation
  DROP CONSTRAINT IF EXISTS crew_compensation_pay_method_check;

ALTER TABLE public.crew_compensation
  ADD CONSTRAINT crew_compensation_pay_method_check
  CHECK (pay_method IN ('hourly', 'daily'));