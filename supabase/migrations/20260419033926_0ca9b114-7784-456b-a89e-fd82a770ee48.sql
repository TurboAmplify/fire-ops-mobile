UPDATE public.shift_tickets
SET status = 'final'
WHERE supervisor_signature_url IS NOT NULL
  AND status <> 'final';