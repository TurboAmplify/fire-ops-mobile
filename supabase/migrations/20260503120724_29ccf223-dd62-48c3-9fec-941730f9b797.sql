
DROP VIEW IF EXISTS public.app_review_protected;

CREATE VIEW public.app_review_protected
WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.plan_code,
  m.user_id AS protected_user_id
FROM public.organizations o
LEFT JOIN public.organization_members m ON m.organization_id = o.id
WHERE o.plan_code = 'app_review';

COMMENT ON VIEW public.app_review_protected IS
  'App Review Account – Do Not Modify. All cleanup scripts must exclude rows referenced here.';
