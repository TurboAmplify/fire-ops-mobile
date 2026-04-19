-- Immutable audit trail for shift tickets
CREATE TABLE public.shift_ticket_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_ticket_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
    -- 'field_change' | 'signature_captured' | 'signature_cleared'
    -- | 'locked' | 'unlocked' | 'relocked' | 'override_edit'
  field_name text,
  old_value text,
  new_value text,
  reason text,
  actor_user_id uuid,
  actor_name text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_ticket_audit_ticket_idx
  ON public.shift_ticket_audit (shift_ticket_id, occurred_at DESC);

ALTER TABLE public.shift_ticket_audit ENABLE ROW LEVEL SECURITY;

-- Members of the org can READ the audit trail
CREATE POLICY sta_select ON public.shift_ticket_audit
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Members of the org can INSERT new entries (write-once)
CREATE POLICY sta_insert ON public.shift_ticket_audit
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- INTENTIONALLY NO UPDATE OR DELETE POLICIES.
-- Without policies, RLS denies all UPDATE and DELETE for non-service-role
-- callers, making this table append-only / tamper-evident.

-- Belt-and-suspenders: a trigger that hard-blocks UPDATE/DELETE even if a
-- future policy is added by mistake.
CREATE OR REPLACE FUNCTION public.shift_ticket_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'shift_ticket_audit is append-only';
END;
$$;

CREATE TRIGGER shift_ticket_audit_no_update
  BEFORE UPDATE ON public.shift_ticket_audit
  FOR EACH ROW EXECUTE FUNCTION public.shift_ticket_audit_immutable();

CREATE TRIGGER shift_ticket_audit_no_delete
  BEFORE DELETE ON public.shift_ticket_audit
  FOR EACH ROW EXECUTE FUNCTION public.shift_ticket_audit_immutable();