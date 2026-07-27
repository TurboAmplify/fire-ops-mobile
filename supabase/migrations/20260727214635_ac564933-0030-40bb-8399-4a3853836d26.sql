ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS paystub_delivery text NOT NULL DEFAULT 'email';

ALTER TABLE public.crew_members
  ADD CONSTRAINT crew_members_paystub_delivery_check
  CHECK (paystub_delivery IN ('email','text','none'));