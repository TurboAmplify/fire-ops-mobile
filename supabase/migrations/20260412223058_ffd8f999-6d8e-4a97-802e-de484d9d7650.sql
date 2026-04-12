
-- Add hourly rate and H&W rate to each crew member
ALTER TABLE public.crew_members
  ADD COLUMN hourly_rate numeric NULL,
  ADD COLUMN hw_rate numeric NULL;

-- Add default H&W rate at org level
ALTER TABLE public.organizations
  ADD COLUMN default_hw_rate numeric NULL;
