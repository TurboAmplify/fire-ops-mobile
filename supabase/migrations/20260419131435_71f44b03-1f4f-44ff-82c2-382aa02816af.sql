-- Global, platform-wide settings (key/value)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ platform-wide settings (e.g. background choice).
CREATE POLICY "platform_settings_select_all_authenticated"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Only platform admins can write settings.
CREATE POLICY "platform_settings_insert_admin"
ON public.platform_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform_settings_update_admin"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform_settings_delete_admin"
ON public.platform_settings
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Stamp updated_at + updated_by on writes
CREATE OR REPLACE FUNCTION public.platform_settings_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_settings_stamp_trg ON public.platform_settings;
CREATE TRIGGER platform_settings_stamp_trg
BEFORE INSERT OR UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.platform_settings_stamp();

-- Seed the background setting with the default (existing hero image).
INSERT INTO public.platform_settings (key, value)
VALUES ('app_background', '{"variant":"hero"}'::jsonb)
ON CONFLICT (key) DO NOTHING;