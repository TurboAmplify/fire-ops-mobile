-- 1. Drop the auto_join_demo_org trigger and function so new signups don't get added to the demo org
DROP TRIGGER IF EXISTS on_profile_created_join_demo_org ON public.profiles;
DROP TRIGGER IF EXISTS auto_join_demo_org_trigger ON public.profiles;
DROP TRIGGER IF EXISTS profiles_auto_join_demo_org ON public.profiles;
DROP FUNCTION IF EXISTS public.auto_join_demo_org() CASCADE;

-- 2. Lock down platform_settings SELECT policy to platform admins only
DROP POLICY IF EXISTS platform_settings_select_all_authenticated ON public.platform_settings;

CREATE POLICY platform_settings_select_admin
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));