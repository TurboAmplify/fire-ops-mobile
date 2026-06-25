CREATE OR REPLACE FUNCTION public.enforce_signup_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _has_invite boolean;
  _has_token boolean;
  _is_app_review boolean;
  _meta_code text;
  _has_code_invite boolean;
BEGIN
  _email := lower(NEW.email);

  _is_app_review := (NEW.id = 'c15018db-048e-4c39-a757-094c2cd78097'::uuid)
                     OR (_email = 'test@fireopshq.com');
  IF _is_app_review THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_invites
    WHERE lower(email) = _email AND status = 'pending' AND expires_at > now()
  ) INTO _has_invite;
  IF _has_invite THEN RETURN NEW; END IF;

  _meta_code := upper(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'invite_code', ''),
    '[^A-Za-z0-9]', '', 'g'));
  IF length(_meta_code) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_invites
      WHERE invite_code = _meta_code
        AND status = 'pending' AND expires_at > now()
    ) INTO _has_code_invite;
    IF _has_code_invite THEN RETURN NEW; END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.provisioning_tokens
    WHERE lower(email) = _email AND status = 'pending' AND expires_at > now()
  ) INTO _has_token;
  IF _has_token THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Signup blocked: this email has not been invited or provisioned. Contact your team administrator.'
    USING ERRCODE = '42501';
END;
$function$;

INSERT INTO public.organization_invites
  (organization_id, email, role, invited_by, invitee_name, expires_at)
VALUES (
  '2ffa93de-506d-4aa7-a53e-a3a04d9626be',
  'sheldonsundstrom@invite.fireopshq.com',
  'crew',
  (SELECT user_id FROM public.organization_members
    WHERE organization_id='2ffa93de-506d-4aa7-a53e-a3a04d9626be' AND role='admin' LIMIT 1),
  'Sheldon Sundstrom',
  now() + interval '30 days'
)
ON CONFLICT (organization_id, email) DO UPDATE
  SET status='pending',
      expires_at=now() + interval '30 days',
      invitee_name='Sheldon Sundstrom',
      role='crew';

UPDATE public.organization_invites
   SET status='pending', expires_at = now() + interval '30 days'
 WHERE id='8561e3dd-87a5-4f8b-84e9-bc05d29b871b';