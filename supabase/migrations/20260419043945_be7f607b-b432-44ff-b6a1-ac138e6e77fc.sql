-- Platform admins allow-list (separate from org-level admin role)
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Helper: is the given user a platform admin?
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  )
$$;

-- Only platform admins can see or change the allow-list.
-- (First admin must be seeded via migration — there is no self-grant path.)
CREATE POLICY "pa_select_self_admin"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "pa_insert_admin"
ON public.platform_admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "pa_update_admin"
ON public.platform_admins
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "pa_delete_admin"
ON public.platform_admins
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Seed the first platform admin (baldrich2025gt@gmail.com)
INSERT INTO public.platform_admins (user_id, notes)
VALUES ('14867e36-4e80-4fa1-8c38-d3998cad9d19', 'Founding platform owner')
ON CONFLICT (user_id) DO NOTHING;