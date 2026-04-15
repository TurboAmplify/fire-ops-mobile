
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_ids uuid[];
BEGIN
  -- Get all org IDs the user belongs to
  SELECT array_agg(organization_id) INTO _org_ids
  FROM organization_members WHERE user_id = _user_id;

  IF _org_ids IS NOT NULL THEN
    -- Delete signature audit logs
    DELETE FROM signature_audit_log WHERE organization_id = ANY(_org_ids);
    -- Delete shift tickets
    DELETE FROM shift_tickets WHERE organization_id = ANY(_org_ids);
    -- Delete shift crew (via shifts -> incident_trucks -> incidents -> org)
    DELETE FROM shift_crew WHERE shift_id IN (
      SELECT s.id FROM shifts s
      JOIN incident_trucks it ON it.id = s.incident_truck_id
      JOIN incidents i ON i.id = it.incident_id
      WHERE i.organization_id = ANY(_org_ids)
    );
    -- Delete shifts
    DELETE FROM shifts WHERE incident_truck_id IN (
      SELECT it.id FROM incident_trucks it
      JOIN incidents i ON i.id = it.incident_id
      WHERE i.organization_id = ANY(_org_ids)
    );
    -- Delete incident truck crew
    DELETE FROM incident_truck_crew WHERE incident_truck_id IN (
      SELECT it.id FROM incident_trucks it
      JOIN incidents i ON i.id = it.incident_id
      WHERE i.organization_id = ANY(_org_ids)
    );
    -- Delete resource orders
    DELETE FROM resource_orders WHERE organization_id = ANY(_org_ids);
    -- Delete agreements
    DELETE FROM agreements WHERE organization_id = ANY(_org_ids);
    -- Delete incident trucks
    DELETE FROM incident_trucks WHERE incident_id IN (
      SELECT id FROM incidents WHERE organization_id = ANY(_org_ids)
    );
    -- Delete incidents
    DELETE FROM incidents WHERE organization_id = ANY(_org_ids);
    -- Delete expenses
    DELETE FROM expenses WHERE organization_id = ANY(_org_ids);
    -- Delete truck-related data
    DELETE FROM truck_service_logs WHERE organization_id = ANY(_org_ids);
    DELETE FROM truck_documents WHERE organization_id = ANY(_org_ids);
    DELETE FROM truck_photos WHERE organization_id = ANY(_org_ids);
    DELETE FROM truck_checklist_items WHERE organization_id = ANY(_org_ids);
    DELETE FROM trucks WHERE organization_id = ANY(_org_ids);
    -- Delete crew members
    DELETE FROM crew_members WHERE organization_id = ANY(_org_ids);
    -- Delete needs list
    DELETE FROM needs_list_items WHERE organization_id = ANY(_org_ids);
    -- Delete org invites
    DELETE FROM organization_invites WHERE organization_id = ANY(_org_ids);
    -- Delete org members
    DELETE FROM organization_members WHERE organization_id = ANY(_org_ids);
    -- Delete organizations
    DELETE FROM organizations WHERE id = ANY(_org_ids);
  END IF;

  -- Delete profile
  DELETE FROM profiles WHERE id = _user_id;
END;
$$;
