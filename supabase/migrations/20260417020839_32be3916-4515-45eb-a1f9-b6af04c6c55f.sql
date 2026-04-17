ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS walkaround_enabled boolean NOT NULL DEFAULT true;