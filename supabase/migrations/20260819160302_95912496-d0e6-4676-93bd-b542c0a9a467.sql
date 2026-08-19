update shift_tickets
set agreement_number = coalesce(agreement_number,'1202SB25T7700'),
    incident_number = coalesce(incident_number,'SD-RBA-000083'),
    financial_code = coalesce(financial_code,'SVYR'),
    updated_at = now()
where incident_truck_id = 'f0814794-3ba0-4669-96b1-3f7baa1707ca' and deleted_at is null;