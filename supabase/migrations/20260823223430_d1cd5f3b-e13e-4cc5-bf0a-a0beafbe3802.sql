create or replace function public.org_crew_days_worked(_org_id uuid, _year int)
returns table(crew_member_id uuid, days integer)
language sql
stable
security definer
set search_path = public
as $$
  select cm.id, count(distinct (pe->>'date'))::int
  from public.shift_tickets st
  cross join lateral jsonb_array_elements(coalesce(st.personnel_entries, '[]'::jsonb)) pe
  join public.crew_members cm
    on cm.organization_id = _org_id
   and lower(btrim(cm.name)) = lower(btrim(pe->>'operator_name'))
  where st.organization_id = _org_id
    and st.deleted_at is null
    and (pe->>'date') ~ '^\d{4}-\d{2}-\d{2}'
    and left(pe->>'date', 4)::int = _year
    and (public.is_real_org_member(auth.uid(), _org_id) or public.is_platform_admin(auth.uid()))
  group by cm.id
$$;

create or replace function public.org_truck_days_out(_org_id uuid, _year int)
returns table(truck_id uuid, days integer)
language sql
stable
security definer
set search_path = public
as $$
  select it.truck_id, count(distinct d)::int
  from public.shift_tickets st
  join public.incident_trucks it on it.id = st.incident_truck_id
  cross join lateral (
    select coalesce(
      nullif(
        (select array_agg(distinct e->>'date')
         from jsonb_array_elements(coalesce(st.equipment_entries, '[]'::jsonb)) e
         where (e->>'date') ~ '^\d{4}-\d{2}-\d{2}'),
        '{}'::text[]),
      (select array_agg(distinct p->>'date')
       from jsonb_array_elements(coalesce(st.personnel_entries, '[]'::jsonb)) p
       where (p->>'date') ~ '^\d{4}-\d{2}-\d{2}')
    ) as dates
  ) src
  cross join lateral unnest(coalesce(src.dates, '{}'::text[])) d
  where st.organization_id = _org_id
    and st.deleted_at is null
    and it.truck_id is not null
    and left(d, 4)::int = _year
    and (public.is_real_org_member(auth.uid(), _org_id) or public.is_platform_admin(auth.uid()))
  group by it.truck_id
$$;

grant execute on function public.org_crew_days_worked(uuid, int) to authenticated;
grant execute on function public.org_truck_days_out(uuid, int) to authenticated;