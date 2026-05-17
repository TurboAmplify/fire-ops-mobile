-- Trigger function: when a crew_member is assigned to an incident_truck,
-- grant the linked user (if any) crew_truck_access for that truck.
CREATE OR REPLACE FUNCTION public.auto_grant_truck_access_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _org_id uuid;
  _truck_id uuid;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Find the user account linked to this crew member (if any)
  SELECT p.id INTO _user_id
  FROM profiles p
  WHERE p.crew_member_id = NEW.crew_member_id
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve the truck + org for this incident_truck row
  SELECT it.truck_id, t.organization_id
  INTO _truck_id, _org_id
  FROM incident_trucks it
  JOIN trucks t ON t.id = it.truck_id
  WHERE it.id = NEW.incident_truck_id;

  IF _truck_id IS NULL OR _org_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO crew_truck_access (organization_id, user_id, truck_id)
  VALUES (_org_id, _user_id, _truck_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_truck_access ON public.incident_truck_crew;
CREATE TRIGGER trg_auto_grant_truck_access
AFTER INSERT OR UPDATE OF is_active, crew_member_id, incident_truck_id
ON public.incident_truck_crew
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_truck_access_on_assignment();

-- Backfill: grant access for all currently active assignments where the
-- crew member is linked to a user.
INSERT INTO public.crew_truck_access (organization_id, user_id, truck_id)
SELECT DISTINCT t.organization_id, p.id, it.truck_id
FROM public.incident_truck_crew itc
JOIN public.incident_trucks it ON it.id = itc.incident_truck_id
JOIN public.trucks t ON t.id = it.truck_id
JOIN public.profiles p ON p.crew_member_id = itc.crew_member_id
WHERE itc.is_active = true
ON CONFLICT DO NOTHING;