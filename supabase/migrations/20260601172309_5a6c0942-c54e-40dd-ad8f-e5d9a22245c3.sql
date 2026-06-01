-- Allow users with crew_truck_access (e.g., crew bosses who aren't org members)
-- to view crew_members and red_cards for people assigned to trucks they can access.
-- This fixes the New Message → Red cards picker showing an empty crew list for
-- accounts that have truck access but no organization_members row.

CREATE OR REPLACE FUNCTION public.user_can_view_crew_member(_user_id uuid, _crew_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.incident_truck_crew itc
    JOIN public.incident_trucks it ON it.id = itc.incident_truck_id
    JOIN public.crew_truck_access cta
      ON cta.truck_id = it.truck_id AND cta.user_id = _user_id
    WHERE itc.crew_member_id = _crew_member_id
      AND itc.is_active = true
  );
$$;

CREATE POLICY "Truck-access users view assigned crew"
ON public.crew_members
FOR SELECT
USING (public.user_can_view_crew_member(auth.uid(), id));

CREATE POLICY "Truck-access users view red cards for assigned crew"
ON public.red_cards
FOR SELECT
USING (public.user_can_view_crew_member(auth.uid(), crew_member_id));