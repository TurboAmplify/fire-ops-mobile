DO $$
DECLARE
  grp RECORD;
  canonical UUID;
  dup UUID;
  max_ts TIMESTAMPTZ;
BEGIN
  FOR grp IN
    SELECT incident_truck_id, subject, array_agg(id ORDER BY created_at) AS ids
    FROM public.communication_threads
    WHERE purpose = 'shift_ticket'
    GROUP BY incident_truck_id, subject
    HAVING COUNT(*) > 1
  LOOP
    canonical := grp.ids[1];
    FOREACH dup IN ARRAY grp.ids[2:array_length(grp.ids,1)]
    LOOP
      UPDATE public.messages SET thread_id = canonical WHERE thread_id = dup;
      UPDATE public.message_drafts SET thread_id = canonical WHERE thread_id = dup;
      UPDATE public.incident_documents SET thread_id = canonical WHERE thread_id = dup;
      UPDATE public.demob_packets SET thread_id = canonical WHERE thread_id = dup;
      UPDATE public.app_notifications SET thread_id = canonical WHERE thread_id = dup;
      DELETE FROM public.communication_threads WHERE id = dup;
    END LOOP;
    SELECT MAX(created_at) INTO max_ts FROM public.messages WHERE thread_id = canonical;
    UPDATE public.communication_threads SET last_message_at = max_ts WHERE id = canonical;
  END LOOP;
END $$;