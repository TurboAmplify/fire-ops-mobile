
-- 1. Org status + stripe columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS provisioned_via text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS legacy_grandfathered boolean NOT NULL DEFAULT false;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_status_check
  CHECK (status IN ('active','suspended','closed','app_review_protected'));

-- Grandfather: all existing orgs are active and flagged legacy (except app_review)
UPDATE public.organizations
SET legacy_grandfathered = true,
    provisioned_via = CASE WHEN plan_code = 'app_review' THEN 'app_review' ELSE 'legacy' END,
    status = 'active'
WHERE provisioned_via = 'legacy';

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- 2. Provisioning tokens (marketing site handshake)
CREATE TABLE IF NOT EXISTS public.provisioning_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  org_name text NOT NULL,
  org_type text NOT NULL DEFAULT 'contractor',
  plan_code text,
  stripe_customer_id text,
  stripe_subscription_id text,
  full_name text,
  status text NOT NULL DEFAULT 'pending', -- pending | consumed | expired
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_user_id uuid,
  consumed_org_id uuid
);

CREATE INDEX IF NOT EXISTS idx_provisioning_tokens_email ON public.provisioning_tokens(lower(email));
CREATE INDEX IF NOT EXISTS idx_provisioning_tokens_status ON public.provisioning_tokens(status);

ALTER TABLE public.provisioning_tokens ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read; nobody can write via PostgREST. Edge functions use service role.
DROP POLICY IF EXISTS "platform admins read provisioning tokens" ON public.provisioning_tokens;
CREATE POLICY "platform admins read provisioning tokens"
  ON public.provisioning_tokens FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- 3. Signup gate trigger on auth.users
CREATE OR REPLACE FUNCTION public.enforce_signup_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _has_invite boolean;
  _has_token boolean;
  _is_app_review boolean;
BEGIN
  _email := lower(NEW.email);

  -- App Review user is always allowed
  _is_app_review := (NEW.id = 'c15018db-048e-4c39-a757-094c2cd78097'::uuid)
                     OR (_email = 'test@fireopshq.com');
  IF _is_app_review THEN
    RETURN NEW;
  END IF;

  -- Pending invite for this email?
  SELECT EXISTS (
    SELECT 1 FROM public.organization_invites
    WHERE lower(email) = _email
      AND status = 'pending'
      AND expires_at > now()
  ) INTO _has_invite;

  IF _has_invite THEN
    RETURN NEW;
  END IF;

  -- Pending provisioning token for this email?
  SELECT EXISTS (
    SELECT 1 FROM public.provisioning_tokens
    WHERE lower(email) = _email
      AND status = 'pending'
      AND expires_at > now()
  ) INTO _has_token;

  IF _has_token THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Signup blocked: this email has not been invited or provisioned. Contact your team administrator.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_signup_path_trigger ON auth.users;
CREATE TRIGGER enforce_signup_path_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_signup_path();

-- 4. Helper to read effective org status (treats app_review as active)
CREATE OR REPLACE FUNCTION public.org_effective_status(_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN plan_code = 'app_review' THEN 'active'
    ELSE COALESCE(status, 'active')
  END
  FROM public.organizations WHERE id = _org_id
$$;
