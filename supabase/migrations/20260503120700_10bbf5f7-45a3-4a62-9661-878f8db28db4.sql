
-- 1) Block deletion of any org marked as App Review
CREATE OR REPLACE FUNCTION public.protect_app_review_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.plan_code = 'app_review' THEN
    RAISE EXCEPTION 'Protected: organization "%" is the App Review test account and cannot be deleted (plan_code=app_review).', OLD.name
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_app_review_org ON public.organizations;
CREATE TRIGGER trg_protect_app_review_org
BEFORE DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.protect_app_review_org();

-- 2) Block organization_members deletion for the App Review user/org pair
CREATE OR REPLACE FUNCTION public.protect_app_review_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_protected boolean;
BEGIN
  SELECT (plan_code = 'app_review') INTO _is_protected
  FROM organizations WHERE id = OLD.organization_id;

  IF COALESCE(_is_protected, false) THEN
    RAISE EXCEPTION 'Protected: cannot remove members from the App Review organization.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_app_review_membership ON public.organization_members;
CREATE TRIGGER trg_protect_app_review_membership
BEFORE DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.protect_app_review_membership();

-- 3) Block deletion of the App Review user's profile
CREATE OR REPLACE FUNCTION public.protect_app_review_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.id = 'c15018db-048e-4c39-a757-094c2cd78097'::uuid THEN
    RAISE EXCEPTION 'Protected: App Review test user profile cannot be deleted.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_app_review_profile ON public.profiles;
CREATE TRIGGER trg_protect_app_review_profile
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_app_review_profile();

-- 4) Helper view for any future cleanup script to use as a denylist
CREATE OR REPLACE VIEW public.app_review_protected AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.plan_code,
  m.user_id AS protected_user_id
FROM organizations o
LEFT JOIN organization_members m ON m.organization_id = o.id
WHERE o.plan_code = 'app_review';

COMMENT ON VIEW public.app_review_protected IS
  'App Review Account – Do Not Modify. All cleanup scripts must exclude rows referenced here.';
