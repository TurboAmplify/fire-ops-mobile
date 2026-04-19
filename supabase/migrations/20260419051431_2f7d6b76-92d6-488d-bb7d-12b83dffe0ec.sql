CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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