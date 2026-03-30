-- Auto-add new users to demo org (temporary for testing)
CREATE OR REPLACE FUNCTION public.auto_join_demo_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only if demo org exists and user has no membership
  IF EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001')
     AND NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = NEW.id) THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_join_demo
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_join_demo_org();