
-- Lock organizations UPDATE to admins
DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id))
  WITH CHECK (public.is_org_admin(auth.uid(), id));

-- Lock invites INSERT/UPDATE/DELETE to admins (SELECT remains: org members + invitee can read)
DROP POLICY IF EXISTS "orginv_insert" ON public.organization_invites;
DROP POLICY IF EXISTS "orginv_update" ON public.organization_invites;
DROP POLICY IF EXISTS "orginv_delete" ON public.organization_invites;

CREATE POLICY "orginv_insert" ON public.organization_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Update: admins can always update; invitee can update only to mark their own invite accepted/declined
CREATE POLICY "orginv_update" ON public.organization_invites
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR email = public.get_auth_email()
  )
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR email = public.get_auth_email()
  );

CREATE POLICY "orginv_delete" ON public.organization_invites
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Audit log: stamp actor server-side so clients cannot spoof actor_user_id / actor_name
CREATE OR REPLACE FUNCTION public.shift_ticket_audit_stamp_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.actor_user_id := auth.uid();
  NEW.actor_name := COALESCE(public.get_auth_email(), 'unknown');
  NEW.occurred_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shift_ticket_audit_stamp_actor_trg ON public.shift_ticket_audit;
CREATE TRIGGER shift_ticket_audit_stamp_actor_trg
  BEFORE INSERT ON public.shift_ticket_audit
  FOR EACH ROW EXECUTE FUNCTION public.shift_ticket_audit_stamp_actor();
