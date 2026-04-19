-- Append-only audit log for platform admin actions
CREATE TABLE public.platform_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_admin_audit_occurred_at
  ON public.platform_admin_audit (occurred_at DESC);
CREATE INDEX idx_platform_admin_audit_actor
  ON public.platform_admin_audit (actor_user_id, occurred_at DESC);
CREATE INDEX idx_platform_admin_audit_target
  ON public.platform_admin_audit (target_type, target_id, occurred_at DESC);

ALTER TABLE public.platform_admin_audit ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read
CREATE POLICY paa_select_platform_admin
ON public.platform_admin_audit
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Inserts go through the RPC (which is SECURITY DEFINER); block direct writes.
-- A restrictive false policy is the cleanest "no one can write directly" guard.
CREATE POLICY paa_no_direct_insert
ON public.platform_admin_audit
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY paa_no_update
ON public.platform_admin_audit
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY paa_no_delete
ON public.platform_admin_audit
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- RPC: only platform admins can log; stamps actor + timestamp server-side
CREATE OR REPLACE FUNCTION public.admin_log_action(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _action IS NULL OR length(trim(_action)) = 0 THEN
    RAISE EXCEPTION 'action is required';
  END IF;

  INSERT INTO public.platform_admin_audit
    (actor_user_id, action, target_type, target_id, payload, reason)
  VALUES
    (auth.uid(), _action, _target_type, _target_id, COALESCE(_payload, '{}'::jsonb), _reason)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- RPC: list audit entries for the super-admin UI
CREATE OR REPLACE FUNCTION public.admin_list_audit(_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  occurred_at timestamptz,
  actor_user_id uuid,
  actor_email text,
  action text,
  target_type text,
  target_id uuid,
  payload jsonb,
  reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.occurred_at,
    a.actor_user_id,
    u.email::text AS actor_email,
    a.action,
    a.target_type,
    a.target_id,
    a.payload,
    a.reason
  FROM public.platform_admin_audit a
  LEFT JOIN auth.users u ON u.id = a.actor_user_id
  ORDER BY a.occurred_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;