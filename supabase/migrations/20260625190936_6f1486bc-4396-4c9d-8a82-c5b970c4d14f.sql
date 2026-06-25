ALTER TABLE public.organization_invites
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');