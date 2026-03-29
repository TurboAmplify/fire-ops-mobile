
-- ===========================================
-- HARDEN RLS: Replace all permissive allow-all policies with authenticated-only
-- ===========================================

-- INCIDENTS
DROP POLICY IF EXISTS "Allow all select" ON public.incidents;
DROP POLICY IF EXISTS "Allow all insert" ON public.incidents;
DROP POLICY IF EXISTS "Allow all update" ON public.incidents;
DROP POLICY IF EXISTS "Allow all delete" ON public.incidents;

CREATE POLICY "Authenticated select" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.incidents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.incidents FOR DELETE TO authenticated USING (true);

-- TRUCKS
DROP POLICY IF EXISTS "Allow all select" ON public.trucks;
DROP POLICY IF EXISTS "Allow all insert" ON public.trucks;
DROP POLICY IF EXISTS "Allow all update" ON public.trucks;
DROP POLICY IF EXISTS "Allow all delete" ON public.trucks;

CREATE POLICY "Authenticated select" ON public.trucks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.trucks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.trucks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.trucks FOR DELETE TO authenticated USING (true);

-- CREW_MEMBERS
DROP POLICY IF EXISTS "Allow all select" ON public.crew_members;
DROP POLICY IF EXISTS "Allow all insert" ON public.crew_members;
DROP POLICY IF EXISTS "Allow all update" ON public.crew_members;
DROP POLICY IF EXISTS "Allow all delete" ON public.crew_members;

CREATE POLICY "Authenticated select" ON public.crew_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.crew_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.crew_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.crew_members FOR DELETE TO authenticated USING (true);

-- INCIDENT_TRUCKS
DROP POLICY IF EXISTS "Allow all select" ON public.incident_trucks;
DROP POLICY IF EXISTS "Allow all insert" ON public.incident_trucks;
DROP POLICY IF EXISTS "Allow all update" ON public.incident_trucks;
DROP POLICY IF EXISTS "Allow all delete" ON public.incident_trucks;

CREATE POLICY "Authenticated select" ON public.incident_trucks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.incident_trucks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.incident_trucks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.incident_trucks FOR DELETE TO authenticated USING (true);

-- INCIDENT_TRUCK_CREW
DROP POLICY IF EXISTS "Allow all select" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Allow all insert" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Allow all update" ON public.incident_truck_crew;
DROP POLICY IF EXISTS "Allow all delete" ON public.incident_truck_crew;

CREATE POLICY "Authenticated select" ON public.incident_truck_crew FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.incident_truck_crew FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.incident_truck_crew FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.incident_truck_crew FOR DELETE TO authenticated USING (true);

-- SHIFTS
DROP POLICY IF EXISTS "Allow all select" ON public.shifts;
DROP POLICY IF EXISTS "Allow all insert" ON public.shifts;
DROP POLICY IF EXISTS "Allow all update" ON public.shifts;
DROP POLICY IF EXISTS "Allow all delete" ON public.shifts;

CREATE POLICY "Authenticated select" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.shifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.shifts FOR DELETE TO authenticated USING (true);

-- SHIFT_CREW
DROP POLICY IF EXISTS "Allow all select" ON public.shift_crew;
DROP POLICY IF EXISTS "Allow all insert" ON public.shift_crew;
DROP POLICY IF EXISTS "Allow all update" ON public.shift_crew;
DROP POLICY IF EXISTS "Allow all delete" ON public.shift_crew;

CREATE POLICY "Authenticated select" ON public.shift_crew FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.shift_crew FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.shift_crew FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.shift_crew FOR DELETE TO authenticated USING (true);

-- EXPENSES
DROP POLICY IF EXISTS "Allow all select" ON public.expenses;
DROP POLICY IF EXISTS "Allow all insert" ON public.expenses;
DROP POLICY IF EXISTS "Allow all update" ON public.expenses;
DROP POLICY IF EXISTS "Allow all delete" ON public.expenses;

CREATE POLICY "Authenticated select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.expenses FOR DELETE TO authenticated USING (true);

-- ===========================================
-- HARDEN STORAGE: receipts bucket
-- ===========================================

-- Drop any existing permissive storage policies
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete receipts" ON storage.objects;

-- Authenticated users can upload to receipts bucket
CREATE POLICY "Allow authenticated upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Authenticated users can read from receipts bucket
CREATE POLICY "Allow authenticated read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');

-- Authenticated users can delete their uploads from receipts bucket
CREATE POLICY "Allow authenticated delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts');
