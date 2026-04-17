-- 1. Fix broken orgmem_insert policy (self-join typo allowed any user to insert into any org)
DROP POLICY IF EXISTS orgmem_insert ON public.organization_members;

CREATE POLICY orgmem_insert
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Bootstrap: target org has no members yet
    NOT EXISTS (
      SELECT 1 FROM public.organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
    )
    -- Or caller is already an admin of the target org
    OR public.is_org_admin(auth.uid(), organization_members.organization_id)
  )
);

-- 2. Rewrite delete_user_data to be role-aware and only wipe org data when the
--    deleting user is an admin AND the last remaining member of that org.
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _is_admin boolean;
  _other_members int;
BEGIN
  -- Iterate over each org the user belongs to
  FOR _org_id IN
    SELECT organization_id FROM organization_members WHERE user_id = _user_id
  LOOP
    SELECT (role = 'admin') INTO _is_admin
    FROM organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
    LIMIT 1;

    SELECT COUNT(*) INTO _other_members
    FROM organization_members
    WHERE organization_id = _org_id AND user_id <> _user_id;

    IF _is_admin AND _other_members = 0 THEN
      -- Last admin of an org with no other members: safe to wipe org data
      DELETE FROM signature_audit_log WHERE organization_id = _org_id;
      DELETE FROM shift_tickets WHERE organization_id = _org_id;
      DELETE FROM shift_crew WHERE shift_id IN (
        SELECT s.id FROM shifts s
        JOIN incident_trucks it ON it.id = s.incident_truck_id
        JOIN incidents i ON i.id = it.incident_id
        WHERE i.organization_id = _org_id
      );
      DELETE FROM shifts WHERE incident_truck_id IN (
        SELECT it.id FROM incident_trucks it
        JOIN incidents i ON i.id = it.incident_id
        WHERE i.organization_id = _org_id
      );
      DELETE FROM incident_truck_crew WHERE incident_truck_id IN (
        SELECT it.id FROM incident_trucks it
        JOIN incidents i ON i.id = it.incident_id
        WHERE i.organization_id = _org_id
      );
      DELETE FROM resource_orders WHERE organization_id = _org_id;
      DELETE FROM agreements WHERE organization_id = _org_id;
      DELETE FROM incident_trucks WHERE incident_id IN (
        SELECT id FROM incidents WHERE organization_id = _org_id
      );
      DELETE FROM incidents WHERE organization_id = _org_id;
      DELETE FROM expenses WHERE organization_id = _org_id;
      DELETE FROM truck_service_logs WHERE organization_id = _org_id;
      DELETE FROM truck_documents WHERE organization_id = _org_id;
      DELETE FROM truck_photos WHERE organization_id = _org_id;
      DELETE FROM truck_checklist_items WHERE organization_id = _org_id;
      DELETE FROM trucks WHERE organization_id = _org_id;
      DELETE FROM crew_members WHERE organization_id = _org_id;
      DELETE FROM needs_list_items WHERE organization_id = _org_id;
      DELETE FROM training_records WHERE organization_id = _org_id;
      DELETE FROM organization_invites WHERE organization_id = _org_id;
      DELETE FROM organization_members WHERE organization_id = _org_id;
      DELETE FROM organizations WHERE id = _org_id;
    ELSE
      -- Non-admin, or admin with other members still present: only remove this user
      DELETE FROM organization_members
      WHERE user_id = _user_id AND organization_id = _org_id;
    END IF;
  END LOOP;

  -- Always delete the user's profile
  DELETE FROM profiles WHERE id = _user_id;
END;
$function$;