CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _org_type text DEFAULT 'contractor'::text,
  _accepts_assignments boolean DEFAULT false,
  _operation_type text DEFAULT 'engine'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _safe_type text;
  _safe_op text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  _safe_type := COALESCE(_org_type, 'contractor');
  IF _safe_type NOT IN ('contractor','vfd','state_agency') THEN
    _safe_type := 'contractor';
  END IF;

  _safe_op := COALESCE(_operation_type, 'engine');
  IF _safe_op NOT IN ('engine','hand_crew','both') THEN
    _safe_op := 'engine';
  END IF;

  INSERT INTO organizations (name, org_type, accepts_assignments, operation_type, tier, seat_limit, modules_enabled)
  VALUES (
    _name,
    _safe_type,
    COALESCE(_accepts_assignments, false),
    _safe_op,
    'free',
    5,
    '{}'::jsonb
  )
  RETURNING id INTO _org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, auth.uid(), 'admin');

  RETURN _org_id;
END;
$function$;