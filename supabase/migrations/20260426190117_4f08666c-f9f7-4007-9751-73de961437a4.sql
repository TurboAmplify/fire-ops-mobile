ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS invitee_name text;

CREATE OR REPLACE FUNCTION public.accept_invite_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite organization_invites%ROWTYPE;
  _user_id uuid := auth.uid();
  _normalized text;
  _existing_name text;
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
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  -- Backfill profile full_name from invite if user hasn't set one
  IF _invite.invitee_name IS NOT NULL AND length(trim(_invite.invitee_name)) > 0 THEN
    SELECT full_name INTO _existing_name FROM profiles WHERE id = _user_id;
    IF _existing_name IS NULL OR length(trim(_existing_name)) = 0 THEN
      UPDATE profiles SET full_name = trim(_invite.invitee_name) WHERE id = _user_id;
    END IF;
  END IF;

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