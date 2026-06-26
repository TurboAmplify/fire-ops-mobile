CREATE OR REPLACE FUNCTION public.prepare_invite_signup(_code text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _normalized_code text;
  _normalized_email text;
  _invite public.organization_invites%ROWTYPE;
  _shadow_invite public.organization_invites%ROWTYPE;
  _shadow_code text;
BEGIN
  _normalized_code := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  _normalized_email := lower(trim(coalesce(_email, '')));

  IF length(_normalized_code) < 6 OR length(_normalized_email) < 3 OR position('@' in _normalized_email) = 0 THEN
    RAISE EXCEPTION 'Invite code is invalid or expired' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _invite
  FROM public.organization_invites
  WHERE invite_code = _normalized_code
    AND status IN ('pending', 'accepted')
    AND expires_at > now()
  ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite code is invalid or expired' USING ERRCODE = '22023';
  END IF;

  _shadow_code := _normalized_code || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.organization_invites (
    organization_id,
    email,
    role,
    invited_by,
    status,
    expires_at,
    invite_code,
    invitee_name
  ) VALUES (
    _invite.organization_id,
    _normalized_email,
    public.normalize_org_member_role(_invite.role),
    _invite.invited_by,
    'pending',
    GREATEST(_invite.expires_at, now() + interval '30 days'),
    _shadow_code,
    _invite.invitee_name
  )
  ON CONFLICT (organization_id, email) DO UPDATE
    SET role = public.normalize_org_member_role(EXCLUDED.role),
        status = CASE
          WHEN public.organization_invites.status IN ('expired', 'accepted') THEN 'pending'
          ELSE public.organization_invites.status
        END,
        expires_at = GREATEST(public.organization_invites.expires_at, EXCLUDED.expires_at),
        invite_code = CASE
          WHEN public.organization_invites.invite_code IS NULL
            OR length(trim(public.organization_invites.invite_code)) = 0
            OR public.organization_invites.status = 'accepted'
            OR public.organization_invites.invite_code = _normalized_code
            THEN EXCLUDED.invite_code
          ELSE public.organization_invites.invite_code
        END,
        invitee_name = COALESCE(NULLIF(trim(public.organization_invites.invitee_name), ''), EXCLUDED.invitee_name)
  RETURNING * INTO _shadow_invite;

  RETURN _shadow_invite.organization_id;
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
    coalesce(
      NEW.raw_user_meta_data->>'invite_code',
      NEW.raw_user_meta_data->>'inviteCode',
      NEW.raw_user_meta_data->>'code',
      ''
    ),
    '[^A-Za-z0-9]', '', 'g'
  ));

  -- Prefer the email-specific invite created by prepare_invite_signup. That is
  -- the only reliable way to support shared team codes without all users being
  -- attached to the original seed invite.
  SELECT * INTO _invite
  FROM public.organization_invites
  WHERE lower(email) = _email
    AND status IN ('pending', 'accepted')
    AND expires_at > now()
  ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1;

  IF _invite.id IS NULL AND length(_meta_code) > 0 THEN
    SELECT * INTO _invite
    FROM public.organization_invites
    WHERE invite_code = _meta_code
      AND status IN ('pending', 'accepted')
      AND expires_at > now()
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
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
  _user_email text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  _normalized := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));

  SELECT lower(email) INTO _user_email
  FROM auth.users
  WHERE id = _user_id;

  IF _user_email IS NOT NULL THEN
    SELECT * INTO _invite
    FROM public.organization_invites
    WHERE lower(email) = _user_email
      AND status IN ('pending', 'accepted')
      AND expires_at > now()
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1;
  END IF;

  IF _invite.id IS NULL THEN
    IF length(_normalized) = 0 THEN
      RAISE EXCEPTION 'Invite code is required';
    END IF;

    SELECT * INTO _invite
    FROM public.organization_invites
    WHERE invite_code = _normalized
      AND status IN ('pending', 'accepted')
      AND expires_at > now()
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1;
  END IF;

  IF _invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite code is invalid or expired';
  END IF;

  _member_role := public.normalize_org_member_role(_invite.role);

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

REVOKE EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.accept_invite_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invite_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_code(text) TO service_role;