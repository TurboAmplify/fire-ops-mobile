ALTER TABLE public.incident_documents DROP CONSTRAINT IF EXISTS incident_documents_stage_check;
ALTER TABLE public.incident_documents ADD CONSTRAINT incident_documents_stage_check
  CHECK (stage = ANY (ARRAY[
    'original'::text,
    'review'::text,
    'contractor_signed'::text,
    'signed'::text,
    'finance_signed'::text,
    'of286_draft_received'::text,
    'of286_draft_approved'::text,
    'of286_changes_requested'::text,
    'of286_pending_user_signature'::text
  ]));