
-- Block direct INSERT into organizations; force creation via secure RPC
DROP POLICY IF EXISTS "org_insert" ON public.organizations;

-- Update the RPC to always reset sensitive fields to safe defaults
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _org_type text DEFAULT 'contractor',
  _accepts_assignments boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _safe_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  _safe_type := COALESCE(_org_type, 'contractor');
  IF _safe_type NOT IN ('contractor','vfd','state_agency') THEN
    _safe_type := 'contractor';
  END IF;

  -- Insert with safe defaults; all sensitive fields fall back to column defaults
  INSERT INTO organizations (name, org_type, accepts_assignments, tier, seat_limit, modules_enabled)
  VALUES (
    _name,
    _safe_type,
    COALESCE(_accepts_assignments, false),
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
