
-- Add new columns to expenses table for workflow support
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS meal_attendees text,
  ADD COLUMN IF NOT EXISTS meal_purpose text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Update existing expenses to 'approved' status so they don't clutter review queue
UPDATE public.expenses SET status = 'approved' WHERE status = 'draft';
