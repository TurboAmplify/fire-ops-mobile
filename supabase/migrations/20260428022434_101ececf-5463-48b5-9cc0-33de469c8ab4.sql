CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NULL,
  user_id uuid NULL,
  route text NULL,
  message text NOT NULL,
  stack text NULL,
  app_version text NULL,
  online boolean NULL,
  user_agent text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_org_occurred ON public.error_logs (organization_id, occurred_at DESC);
CREATE INDEX idx_error_logs_occurred ON public.error_logs (occurred_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_logs_insert_authenticated
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY error_logs_select_admin
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
  );

CREATE POLICY error_logs_no_update
  ON public.error_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY error_logs_no_delete
  ON public.error_logs
  FOR DELETE
  TO authenticated
  USING (false);