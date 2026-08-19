create or replace function public.user_is_on_incident(_user_id uuid, _incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from incident_truck_crew itc
    join incident_trucks it on it.id = itc.incident_truck_id
    where it.incident_id = _incident_id
      and itc.is_active
      and itc.crew_member_id = public.get_user_crew_member_id(_user_id)
  )
$$;

drop policy if exists it_select on public.incident_trucks;
create policy it_select on public.incident_trucks
for select
using (
  get_org_from_incident_truck(id) in (select get_user_org_ids(auth.uid()))
  and (
    user_can_access_truck(auth.uid(), truck_id)
    or public.user_is_on_incident(auth.uid(), incident_id)
  )
);

drop policy if exists trucks_select on public.trucks;
create policy trucks_select on public.trucks
for select
using (
  organization_id in (select get_user_org_ids(auth.uid()))
  and (
    is_org_admin(auth.uid(), organization_id)
    or exists (
      select 1 from crew_truck_access cta
      where cta.user_id = auth.uid() and cta.truck_id = trucks.id
    )
    or exists (
      select 1 from incident_trucks it
      where it.truck_id = trucks.id
        and public.user_is_on_incident(auth.uid(), it.incident_id)
    )
  )
);

drop policy if exists itc_select on public.incident_truck_crew;
create policy itc_select on public.incident_truck_crew
for select
using (
  exists (
    select 1 from incident_trucks it
    where it.id = incident_truck_crew.incident_truck_id
      and (
        user_can_access_truck(auth.uid(), it.truck_id)
        or public.user_is_on_incident(auth.uid(), it.incident_id)
      )
  )
);