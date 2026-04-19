-- 1. Add invite_code column to organization_invites
ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS invite_code text;

-- 2. Code generator: 8-char uppercase, no ambiguous characters
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0,O,1,I
  _code text;
  _i int;
  _attempts int := 0;
BEGIN
  LOOP
    _code := '';
    FOR _i IN 1..8 LOOP
      _code := _code || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organization_invites WHERE invite_code = _code);
    _attempts := _attempts + 1;
    IF _attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique invite code';
    END IF;
  END LOOP;
  RETURN _code;
END;
$$;

-- 3. Trigger to auto-fill invite_code on insert if not provided
CREATE OR REPLACE FUNCTION public.organization_invites_set_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR length(trim(NEW.invite_code)) = 0 THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organization_invites_set_code ON public.organization_invites;
CREATE TRIGGER trg_organization_invites_set_code
  BEFORE INSERT ON public.organization_invites
  FOR EACH ROW EXECUTE FUNCTION public.organization_invites_set_code();

-- 4. Backfill any existing rows that don't have a code
UPDATE public.organization_invites
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL;

-- 5. Enforce uniqueness + non-null going forward
ALTER TABLE public.organization_invites
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_invite_code_key
  ON public.organization_invites (invite_code);

-- 6. RPC: accept an invite by code (used by signup flow)
CREATE OR REPLACE FUNCTION public.accept_invite_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite organization_invites%ROWTYPE;
  _user_id uuid := auth.uid();
  _normalized text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  _normalized := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));

  SELECT * INTO _invite
  FROM organization_invites
  WHERE invite_code = _normalized
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF _invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite has already been used';
  END IF;

  IF _invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  -- If user is already a member of this org, just mark the invite accepted and return
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _invite.organization_id
  ) THEN
    UPDATE organization_invites SET status = 'accepted' WHERE id = _invite.id;
    RETURN _invite.organization_id;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_invite.organization_id, _user_id, _invite.role);

  UPDATE organization_invites SET status = 'accepted' WHERE id = _invite.id;

  RETURN _invite.organization_id;
END;
$$;