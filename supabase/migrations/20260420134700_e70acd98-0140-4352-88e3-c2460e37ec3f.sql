UPDATE public.shift_tickets st
SET 
  serial_vin_number = COALESCE(NULLIF(st.serial_vin_number, ''), t.vin),
  license_id_number = COALESCE(NULLIF(st.license_id_number, ''), t.plate),
  equipment_make_model = COALESCE(NULLIF(st.equipment_make_model, ''), NULLIF(TRIM(CONCAT_WS(' ', t.year::text, t.make, t.model)), '')),
  equipment_type = COALESCE(NULLIF(st.equipment_type, ''), t.unit_type),
  updated_at = now()
FROM public.incident_trucks it
JOIN public.trucks t ON t.id = it.truck_id
JOIN public.incidents i ON i.id = it.incident_id
WHERE st.incident_truck_id = it.id
  AND i.name ILIKE '%severity%'
  AND st.supervisor_signed_at IS NULL
  AND t.vin IS NOT NULL;