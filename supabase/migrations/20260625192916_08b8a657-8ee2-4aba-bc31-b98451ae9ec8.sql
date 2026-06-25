ALTER TABLE public.organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_role_check;

UPDATE public.organization_invites
SET role = CASE
  WHEN role IN ('owner', 'admin') THEN 'admin'
  WHEN role IN ('crew_boss', 'engine_boss') THEN 'engine_boss'
  ELSE 'crew_member'
END
WHERE role NOT IN ('admin', 'engine_boss', 'crew_member');

ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_role_check
  CHECK (role IN ('admin', 'engine_boss', 'crew_member'));

CREATE OR REPLACE FUNCTION public.normalize_org_member_role(_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _role IN ('owner', 'admin') THEN 'admin'
    WHEN _role IN ('crew_boss', 'engine_boss') THEN 'engine_boss'
    ELSE 'crew_member'
  END
$$;

CREATE OR REPLACE FUNCTION public.link_profile_to_invited_crew_member(
  _user_id uuid,
  _organization_id uuid,
  _invitee_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _crew_member_id uuid;
BEGIN
  IF _user_id IS NULL OR _organization_id IS NULL OR length(trim(coalesce(_invitee_name, ''))) = 0 THEN
    RETURN;
  END IF;

  SELECT cm.id INTO _crew_member_id
  FROM public.crew_members cm
  WHERE cm.organization_id = _organization_id
    AND lower(trim(cm.name)) = lower(trim(_invitee_name))
  ORDER BY cm.active DESC, cm.created_at ASC
  LIMIT 1;

  IF _crew_member_id IS NOT NULL THEN
    UPDATE public.profiles
    SET crew_member_id = COALESCE(crew_member_id, _crew_member_id)
    WHERE id = _user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite public.organization_invites%ROWTYPE;
  _user_id uuid := auth.uid();
  _normalized text;
  _existing_name text;
  _member_role text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  _normalized := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));

  SELECT * INTO _invite
  FROM public.organization_invites
  WHERE invite_code = _normalized
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  -- If signup already consumed this code for this same user, allow the
  -- immediate post-signup RPC to succeed instead of showing a false error.
  IF _invite.status = 'accepted' THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = _user_id AND organization_id = _invite.organization_id
    ) THEN
      RETURN _invite.organization_id;
    END IF;
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  IF _invite.status <> 'pending' OR _invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  _member_role := public.normalize_org_member_role(_invite.role);

  -- Backfill profile full_name from invite if user hasn't set one.
  IF _invite.invitee_name IS NOT NULL AND length(trim(_invite.invitee_name)) > 0 THEN
    SELECT full_name INTO _existing_name FROM public.profiles WHERE id = _user_id;
    IF _existing_name IS NULL OR length(trim(_existing_name)) = 0 THEN
      UPDATE public.profiles SET full_name = trim(_invite.invitee_name) WHERE id = _user_id;
    END IF;
  END IF;

  PERFORM public.link_profile_to_invited_crew_member(_user_id, _invite.organization_id, _invite.invitee_name);

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_invite.organization_id, _user_id, _member_role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE id = _invite.id;

  RETURN _invite.organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text := lower(NEW.email);
  _meta_code text;
  _invite public.organization_invites%ROWTYPE;
  _member_role text;
  _profile_name text;
BEGIN
  _profile_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, _profile_name)
  ON CONFLICT (id) DO NOTHING;

  _meta_code := upper(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'invite_code', ''),
    '[^A-Za-z0-9]', '', 'g'
  ));

  IF length(_meta_code) > 0 THEN
    SELECT * INTO _invite
    FROM public.organization_invites
    WHERE invite_code = _meta_code
      AND status = 'pending'
      AND expires_at > now()
    LIMIT 1;
  END IF;

  IF _invite.id IS NULL THEN
    SELECT * INTO _invite
    FROM public.organization_invites
    WHERE lower(email) = _email
      AND status = 'pending'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF _invite.id IS NOT NULL THEN
    _member_role := public.normalize_org_member_role(_invite.role);

    IF _invite.invitee_name IS NOT NULL AND length(trim(_invite.invitee_name)) > 0 THEN
      UPDATE public.profiles
      SET full_name = CASE
        WHEN full_name IS NULL OR length(trim(full_name)) = 0 THEN trim(_invite.invitee_name)
        ELSE full_name
      END
      WHERE id = NEW.id;
    END IF;

    PERFORM public.link_profile_to_invited_crew_member(NEW.id, _invite.organization_id, _invite.invitee_name);

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_invite.organization_id, NEW.id, _member_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;

    UPDATE public.organization_invites
    SET status = 'accepted'
    WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.organization_invites
SET status = 'pending',
    role = 'crew_member',
    expires_at = now() + interval '30 days'
WHERE invite_code = 'FGXNU9LE'
  AND invitee_name = 'Sheldon Sundstrom';