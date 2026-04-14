-- Drop old check constraint
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

-- Migrate existing data
UPDATE public.incidents SET status = 'demob' WHERE status IN ('contained', 'controlled');
UPDATE public.incidents SET status = 'closed' WHERE status = 'out';

-- Add new check constraint
ALTER TABLE public.incidents ADD CONSTRAINT incidents_status_check CHECK (status IN ('active', 'demob', 'closed'));