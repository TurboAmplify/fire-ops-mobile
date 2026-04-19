
-- Block direct org INSERT/DELETE entirely; safe paths use SECURITY DEFINER functions
CREATE POLICY "org_insert_blocked" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "org_delete_blocked" ON public.organizations
  FOR DELETE TO authenticated USING (false);

-- Signature audit: strictly append-only
CREATE POLICY "sal_no_update" ON public.signature_audit_log
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "sal_no_delete" ON public.signature_audit_log
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);
