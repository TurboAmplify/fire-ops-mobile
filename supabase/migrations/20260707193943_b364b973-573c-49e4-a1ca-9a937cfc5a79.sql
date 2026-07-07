REVOKE ALL ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_incident_truck_crew(uuid, uuid) TO service_role;