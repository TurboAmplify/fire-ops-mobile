
GRANT SELECT (phone, hourly_rate, hw_rate) ON public.crew_members TO authenticated;
DROP VIEW IF EXISTS public.crew_members_sensitive;
