ALTER TABLE public.shift_tickets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS idx_shift_tickets_deleted_at ON public.shift_tickets (deleted_at);
