
-- Move shift tickets (and their audit trail, which references shift_ticket_id) from
-- the duplicate 7/05 Stick Fire truck assignment to the 7/04 Stick Fire (the one with
-- Jetport info). Then delete the duplicate incident; cascades clean up its now-empty
-- incident_truck row and its crew assignments (crew is identical on both).

UPDATE public.shift_tickets
SET incident_truck_id = 'c659405f-70d2-4aa4-8426-6ac8df8247a6'
WHERE incident_truck_id = '64d1d37c-9532-4c1f-b7a4-c7d4c48e2a17';

DELETE FROM public.incidents
WHERE id = '8438d203-2f26-46d5-85f8-ede26bb8f9c9';
