WITH pe AS (
  SELECT it.incident_id, e->>'operator_name' AS nm, (e->>'date')::date AS d
  FROM shift_tickets st
  JOIN incident_trucks it ON it.id = st.incident_truck_id
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(st.personnel_entries,'[]'::jsonb)) e
  WHERE st.organization_id = '2ffa93de-506d-4aa7-a53e-a3a04d9626be'
    AND st.deleted_at IS NULL
    AND e->>'date' IS NOT NULL AND e->>'operator_name' IS NOT NULL
), spans AS (
  SELECT incident_id, min(d) AS mn, max(d) AS mx FROM pe GROUP BY incident_id
), paid AS (
  SELECT DISTINCT cm.id AS crew_member_id, s.mn, s.mx
  FROM pe
  JOIN spans s ON s.incident_id = pe.incident_id
  JOIN crew_members cm
    ON cm.organization_id = '2ffa93de-506d-4aa7-a53e-a3a04d9626be'
   AND lower(btrim(cm.name)) = lower(btrim(pe.nm))
  WHERE s.mx <= DATE '2026-07-18'
)
INSERT INTO payroll_payments (organization_id, crew_member_id, period_start, period_end, amount, paystub_sent_via, marked_by_user_id)
SELECT '2ffa93de-506d-4aa7-a53e-a3a04d9626be', crew_member_id, mn, mx, NULL, NULL, NULL
FROM paid
WHERE NOT EXISTS (
  SELECT 1 FROM payroll_payments pp
  WHERE pp.crew_member_id = paid.crew_member_id
    AND pp.period_start = paid.mn AND pp.period_end = paid.mx
);