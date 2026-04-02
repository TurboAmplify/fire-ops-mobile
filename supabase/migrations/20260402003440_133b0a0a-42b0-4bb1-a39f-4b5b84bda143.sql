ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS weight_empty integer,
  ADD COLUMN IF NOT EXISTS weight_full integer,
  ADD COLUMN IF NOT EXISTS gvwr integer,
  ADD COLUMN IF NOT EXISTS fuel_capacity integer,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS last_oil_change_date date,
  ADD COLUMN IF NOT EXISTS last_oil_change_mileage integer,
  ADD COLUMN IF NOT EXISTS next_oil_change_mileage integer,
  ADD COLUMN IF NOT EXISTS bed_length text,
  ADD COLUMN IF NOT EXISTS engine_type text;