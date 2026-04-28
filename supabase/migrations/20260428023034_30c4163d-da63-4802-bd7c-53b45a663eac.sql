DROP POLICY IF EXISTS error_logs_select_admin ON public.error_logs;

CREATE POLICY error_logs_select_platform_admin
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));