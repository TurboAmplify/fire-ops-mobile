ALTER TABLE public.factoring_submissions
  ADD COLUMN IF NOT EXISTS reserve_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserve_released_by uuid;