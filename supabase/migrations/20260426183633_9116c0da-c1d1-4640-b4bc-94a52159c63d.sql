-- 1. Add billing columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'contractor_trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Constrain billing_status values
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_billing_status_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_billing_status_check
  CHECK (billing_status IN ('trial','active','read_only','locked'));

-- 2. Replace create_organization_with_owner to seed billing fields
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _org_type text DEFAULT 'contractor',
  _accepts_assignments boolean DEFAULT false,
  _operation_type text DEFAULT 'engine'
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
  _plan_code text;
  _billing_status text;
  _trial_ends timestamptz;
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

  -- Pick billing defaults by org type
  IF _safe_type = 'contractor' THEN
    _plan_code := 'contractor_trial';
    _billing_status := 'trial';
    _trial_ends := now() + interval '30 days';
  ELSIF _safe_type = 'vfd' THEN
    _plan_code := 'vfd_preview';
    _billing_status := 'trial';
    _trial_ends := now() + interval '30 days';
  ELSE
    _plan_code := 'agency_standard';
    _billing_status := 'active';
    _trial_ends := NULL;
  END IF;

  INSERT INTO organizations (
    name, org_type, accepts_assignments, operation_type,
    tier, seat_limit, modules_enabled,
    billing_status, plan_code, trial_ends_at
  )
  VALUES (
    _name,
    _safe_type,
    COALESCE(_accepts_assignments, false),
    _safe_op,
    'free',
    5,
    '{}'::jsonb,
    _billing_status,
    _plan_code,
    _trial_ends
  )
  RETURNING id INTO _org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_org_id, auth.uid(), 'admin');

  RETURN _org_id;
END;
$function$;

-- 3. Admin RPC: set billing fields with audit
CREATE OR REPLACE FUNCTION public.admin_set_org_billing(
  _org_id uuid,
  _billing_status text,
  _plan_code text DEFAULT NULL,
  _trial_ends_at timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _old_status text;
  _old_plan text;
  _old_trial timestamptz;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _billing_status NOT IN ('trial','active','read_only','locked') THEN
    RAISE EXCEPTION 'Invalid billing_status: %', _billing_status;
  END IF;

  SELECT billing_status, plan_code, trial_ends_at
    INTO _old_status, _old_plan, _old_trial
  FROM organizations WHERE id = _org_id;

  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  UPDATE organizations
  SET billing_status = _billing_status,
      plan_code = COALESCE(_plan_code, plan_code),
      trial_ends_at = CASE
        WHEN _billing_status = 'active' THEN NULL
        ELSE COALESCE(_trial_ends_at, trial_ends_at)
      END
  WHERE id = _org_id;

  INSERT INTO platform_admin_audit (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES (
    auth.uid(),
    'set_org_billing',
    'organization',
    _org_id,
    jsonb_build_object(
      'old', jsonb_build_object('billing_status', _old_status, 'plan_code', _old_plan, 'trial_ends_at', _old_trial),
      'new', jsonb_build_object('billing_status', _billing_status, 'plan_code', COALESCE(_plan_code, _old_plan), 'trial_ends_at', _trial_ends_at)
    ),
    _reason
  );
END;
$function$;

-- 4. Admin RPC: extend trial by N days
CREATE OR REPLACE FUNCTION public.admin_extend_org_trial(
  _org_id uuid,
  _days integer,
  _reason text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_end timestamptz;
  _new_end timestamptz;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _days IS NULL OR _days <= 0 THEN
    RAISE EXCEPTION 'Days must be a positive integer';
  END IF;

  SELECT trial_ends_at INTO _current_end FROM organizations WHERE id = _org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  _new_end := COALESCE(GREATEST(_current_end, now()), now()) + make_interval(days => _days);

  UPDATE organizations
  SET trial_ends_at = _new_end,
      billing_status = CASE WHEN billing_status IN ('read_only','locked') THEN 'trial' ELSE billing_status END
  WHERE id = _org_id;

  INSERT INTO platform_admin_audit (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES (
    auth.uid(),
    'extend_org_trial',
    'organization',
    _org_id,
    jsonb_build_object('days', _days, 'previous_end', _current_end, 'new_end', _new_end),
    _reason
  );

  RETURN _new_end;
END;
$function$;

-- 5. Backfill existing orgs to sensible defaults so nobody gets locked out
UPDATE public.organizations
SET billing_status = 'active',
    plan_code = CASE
      WHEN org_type = 'vfd' THEN 'vfd_partner'
      WHEN org_type = 'state_agency' THEN 'agency_standard'
      ELSE 'contractor_active'
    END,
    trial_ends_at = NULL
WHERE billing_status = 'trial'
  AND created_at < now() - interval '1 minute';