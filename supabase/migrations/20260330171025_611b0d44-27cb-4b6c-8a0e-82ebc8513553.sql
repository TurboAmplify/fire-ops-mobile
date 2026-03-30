
-- =============================================
-- STEP 1: Multi-tenant foundation migration
-- =============================================

-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Permissive policies (will be tightened in Step 4)
CREATE POLICY "Authenticated select" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.organizations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.organizations FOR DELETE TO authenticated USING (true);

-- 2. Create organization_members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'crew_boss', 'crew_member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select" ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.organization_members FOR DELETE TO authenticated USING (true);

-- 3. Create organization_invites table
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'crew_boss', 'crew_member')),
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (organization_id, email)
);
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select" ON public.organization_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.organization_invites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.organization_invites FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.organization_invites FOR DELETE TO authenticated USING (true);

-- 4. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  crew_member_id uuid REFERENCES public.crew_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.profiles FOR DELETE TO authenticated USING (true);

-- 5. Add organization_id to business tables (all nullable for safe migration)
ALTER TABLE public.incidents ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.trucks ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.crew_members ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.agreements ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.resource_orders ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Create indexes on organization_id columns
CREATE INDEX idx_incidents_org ON public.incidents(organization_id);
CREATE INDEX idx_trucks_org ON public.trucks(organization_id);
CREATE INDEX idx_crew_members_org ON public.crew_members(organization_id);
CREATE INDEX idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX idx_agreements_org ON public.agreements(organization_id);
CREATE INDEX idx_resource_orders_org ON public.resource_orders(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX idx_org_invites_token ON public.organization_invites(token);

-- 7. Security-definer helper functions

-- Get all org IDs a user belongs to
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = _user_id
$$;

-- Check if user has a specific role in an org
CREATE OR REPLACE FUNCTION public.user_has_org_role(_user_id uuid, _org_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

-- Get crew_member_id for an authenticated user
CREATE OR REPLACE FUNCTION public.get_user_crew_member_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crew_member_id FROM profiles WHERE id = _user_id
$$;

-- Resolve org_id from an incident_truck row (for child table RLS)
CREATE OR REPLACE FUNCTION public.get_org_from_incident_truck(_it_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.organization_id FROM incident_trucks it
  JOIN incidents i ON i.id = it.incident_id
  WHERE it.id = _it_id
$$;

-- 8. Trigger to auto-create profiles row on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
