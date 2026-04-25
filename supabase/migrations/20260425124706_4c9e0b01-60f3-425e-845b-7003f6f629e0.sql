ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS day_rate numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.trucks.day_rate IS 'Billable revenue per day this truck is assigned to an incident (used in P&L revenue calculation).';

-- Pre-populate DL31 and DL62 (and DL61 alias) at $4,000/day for existing trucks
UPDATE public.trucks SET day_rate = 4000 WHERE name IN ('DL31','DL61','DL62') AND day_rate = 0;