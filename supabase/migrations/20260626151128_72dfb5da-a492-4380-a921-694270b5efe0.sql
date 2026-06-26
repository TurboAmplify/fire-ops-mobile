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
  _shadow_invite_id uuid;
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
    _normalized_code,
    _invite.invitee_name
  )
  ON CONFLICT (organization_id, email) DO UPDATE
    SET role = public.normalize_org_member_role(EXCLUDED.role),
        status = CASE
          WHEN public.organization_invites.status = 'expired' THEN 'pending'
          ELSE public.organization_invites.status
        END,
        expires_at = GREATEST(public.organization_invites.expires_at, EXCLUDED.expires_at),
        invite_code = EXCLUDED.invite_code,
        invitee_name = COALESCE(public.organization_invites.invitee_name, EXCLUDED.invitee_name)
  RETURNING id INTO _shadow_invite_id;

  RETURN _invite.organization_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_invite_signup(text, text) TO service_role;