
CREATE TABLE public.signature_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_ticket_id uuid NOT NULL,
  organization_id uuid,
  signer_type text NOT NULL,
  signer_name text,
  signature_url text NOT NULL,
  method text NOT NULL,
  font_used text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.signature_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sal_select" ON public.signature_audit_log
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "sal_insert" ON public.signature_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "sal_update" ON public.signature_audit_log
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "sal_delete" ON public.signature_audit_log
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE INDEX idx_sal_shift_ticket ON public.signature_audit_log(shift_ticket_id);
CREATE INDEX idx_sal_org ON public.signature_audit_log(organization_id);
