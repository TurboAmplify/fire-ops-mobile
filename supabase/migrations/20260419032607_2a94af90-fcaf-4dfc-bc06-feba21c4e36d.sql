CREATE OR REPLACE FUNCTION public.shift_ticket_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'shift_ticket_audit is append-only';
END;
$$;