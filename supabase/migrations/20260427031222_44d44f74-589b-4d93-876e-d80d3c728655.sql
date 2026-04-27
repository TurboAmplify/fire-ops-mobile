ALTER TABLE public.incident_documents
  ADD COLUMN IF NOT EXISTS of286_invoice_total numeric,
  ADD COLUMN IF NOT EXISTS of286_entered_at timestamptz;