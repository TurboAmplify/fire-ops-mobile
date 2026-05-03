
-- 1. Extend incident_documents for multi-stage tracking
ALTER TABLE public.incident_documents
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.incident_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS signed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS signed_by_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

ALTER TABLE public.incident_documents
  DROP CONSTRAINT IF EXISTS incident_documents_stage_check;
ALTER TABLE public.incident_documents
  ADD CONSTRAINT incident_documents_stage_check
  CHECK (stage IN ('original','contractor_signed','finance_signed'));

CREATE INDEX IF NOT EXISTS idx_incident_documents_stage
  ON public.incident_documents(incident_id, document_type, stage);

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.incident_document_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  incident_id uuid NOT NULL,
  document_id uuid,
  document_type text NOT NULL DEFAULT 'of286',
  stage text,
  event_type text NOT NULL, -- 'uploaded' | 'signed' | 'downloaded' | 'replaced' | 'deleted'
  actor_user_id uuid,
  actor_name text,
  file_name text,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incdocaudit_incident
  ON public.incident_document_audit(incident_id, occurred_at DESC);

ALTER TABLE public.incident_document_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idoca_select ON public.incident_document_audit;
CREATE POLICY idoca_select ON public.incident_document_audit
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS idoca_insert ON public.incident_document_audit;
CREATE POLICY idoca_insert ON public.incident_document_audit
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS idoca_no_update ON public.incident_document_audit;
CREATE POLICY idoca_no_update ON public.incident_document_audit
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS idoca_no_delete ON public.incident_document_audit;
CREATE POLICY idoca_no_delete ON public.incident_document_audit
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
