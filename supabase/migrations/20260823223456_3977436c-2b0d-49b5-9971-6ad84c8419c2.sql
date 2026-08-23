revoke execute on function public.org_crew_days_worked(uuid, int) from public, anon;
revoke execute on function public.org_truck_days_out(uuid, int) from public, anon;
grant execute on function public.org_crew_days_worked(uuid, int) to authenticated;
grant execute on function public.org_truck_days_out(uuid, int) to authenticated;