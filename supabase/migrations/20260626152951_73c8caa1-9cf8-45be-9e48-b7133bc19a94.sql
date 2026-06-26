ALTER TABLE public.red_cards
  ADD COLUMN IF NOT EXISTS fitness_test_expiration_date date,
  ADD COLUMN IF NOT EXISTS rt130_date date,
  ADD COLUMN IF NOT EXISTS rt130_expiration_date date,
  ADD COLUMN IF NOT EXISTS rt130_includes_190 boolean NOT NULL DEFAULT false;