ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz NULL;