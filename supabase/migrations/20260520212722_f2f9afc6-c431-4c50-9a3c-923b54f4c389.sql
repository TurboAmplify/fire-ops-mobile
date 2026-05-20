
CREATE OR REPLACE FUNCTION public.ensure_org_email_handle()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.email_handle IS NOT NULL AND NEW.email_handle ~ '^[a-z0-9][a-z0-9-]{2,30}$' THEN
    RETURN NEW;
  END IF;
  base := lower(regexp_replace(coalesce(NEW.name, 'org'), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  IF length(base) > 28 THEN base := substring(base from 1 for 28); END IF;
  base := trim(both '-' from base);
  IF length(base) < 3 THEN base := rpad(coalesce(base,'org'), 3, 'x'); END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE email_handle = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := substring(base from 1 for 28) || '-' || n::text;
  END LOOP;
  NEW.email_handle := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_org_email_handle ON public.organizations;
CREATE TRIGGER trg_ensure_org_email_handle
BEFORE INSERT OR UPDATE OF name, email_handle ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.ensure_org_email_handle();

-- Backfill rows missing a valid handle
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.organizations
           WHERE email_handle IS NULL OR email_handle !~ '^[a-z0-9][a-z0-9-]{2,30}$'
  LOOP
    base := trim(both '-' from lower(regexp_replace(coalesce(r.name,'org'), '[^a-zA-Z0-9]+', '-', 'g')));
    IF length(base) > 28 THEN base := substring(base from 1 for 28); END IF;
    base := trim(both '-' from base);
    IF length(base) < 3 THEN base := rpad(coalesce(base,'org'), 3, 'x'); END IF;
    candidate := base;
    n := 0;
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE email_handle = candidate AND id <> r.id) LOOP
      n := n + 1;
      candidate := substring(base from 1 for 28) || '-' || n::text;
    END LOOP;
    UPDATE public.organizations SET email_handle = candidate WHERE id = r.id;
  END LOOP;
END $$;
