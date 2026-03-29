
-- ============================================
-- FireOps HQ — Full Schema Migration
-- ============================================

-- 1. incidents
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wildfire', 'prescribed', 'structure', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contained', 'controlled', 'out')),
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  acres NUMERIC,
  containment INTEGER CHECK (containment >= 0 AND containment <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. trucks
CREATE TABLE public.trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'deployed', 'maintenance')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. crew_members
CREATE TABLE public.crew_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. incident_trucks (central assignment: truck on an incident)
CREATE TABLE public.incident_trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, truck_id)
);

-- 5. incident_truck_crew (crew assigned to a truck on an incident)
CREATE TABLE public.incident_truck_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_truck_id UUID NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  role_on_assignment TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_truck_id, crew_member_id)
);

-- 6. shifts (time tracking per truck assignment)
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_truck_id UUID NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'day' CHECK (type IN ('day', 'night')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. shift_crew (historical snapshot of who worked a shift)
CREATE TABLE public.shift_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  hours NUMERIC NOT NULL,
  role_on_shift TEXT,
  notes TEXT,
  UNIQUE (shift_id, crew_member_id)
);

-- 8. expenses (linked to truck assignment on incident)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_truck_id UUID NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('fuel', 'ppe', 'food', 'lodging', 'equipment', 'other')),
  amount NUMERIC NOT NULL,
  description TEXT,
  receipt_url TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for common queries
-- ============================================
CREATE INDEX idx_incident_trucks_incident ON public.incident_trucks(incident_id);
CREATE INDEX idx_incident_trucks_truck ON public.incident_trucks(truck_id);
CREATE INDEX idx_incident_truck_crew_itid ON public.incident_truck_crew(incident_truck_id);
CREATE INDEX idx_incident_truck_crew_crew ON public.incident_truck_crew(crew_member_id);
CREATE INDEX idx_shifts_itid ON public.shifts(incident_truck_id);
CREATE INDEX idx_shifts_date ON public.shifts(date);
CREATE INDEX idx_shift_crew_shift ON public.shift_crew(shift_id);
CREATE INDEX idx_shift_crew_crew ON public.shift_crew(crew_member_id);
CREATE INDEX idx_expenses_itid ON public.expenses(incident_truck_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_truck_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies — open read/write for now (no auth yet)
-- Will be tightened when auth is added
-- ============================================
CREATE POLICY "Allow all select" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.incidents FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.incidents FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.trucks FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.trucks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.trucks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.trucks FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.crew_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.crew_members FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.crew_members FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.incident_trucks FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.incident_trucks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.incident_trucks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.incident_trucks FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.incident_truck_crew FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.incident_truck_crew FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.incident_truck_crew FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.incident_truck_crew FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.shifts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.shifts FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.shift_crew FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.shift_crew FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.shift_crew FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.shift_crew FOR DELETE USING (true);

CREATE POLICY "Allow all select" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.expenses FOR DELETE USING (true);
