
-- 1. AI extraction cache on incident docs
ALTER TABLE public.incident_documents
  ADD COLUMN IF NOT EXISTS of286_parsed jsonb;

-- 2. Per-org factoring profile
CREATE TABLE IF NOT EXISTS public.org_factoring_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  factor_company_name text NOT NULL DEFAULT 'WideQ Financial LLC',
  factor_contact_name text,
  factor_contact_email text,
  factor_contact_phone text,
  reserve_percent numeric(5,2) NOT NULL DEFAULT 15.00,
  agreement_date date,
  signer_name text,
  signer_title text NOT NULL DEFAULT 'Owner',
  signature_url text,
  next_schedule_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_factoring_settings TO authenticated;
GRANT ALL ON public.org_factoring_settings TO service_role;

ALTER TABLE public.org_factoring_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ofs_select_admin ON public.org_factoring_settings
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ofs_insert_admin ON public.org_factoring_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ofs_update_admin ON public.org_factoring_settings
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY ofs_delete_admin ON public.org_factoring_settings
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER ofs_touch BEFORE UPDATE ON public.org_factoring_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Submission log
CREATE TABLE IF NOT EXISTS public.factoring_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  incident_id uuid NOT NULL,
  schedule_number integer NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  reserve_amount numeric(14,2) NOT NULL DEFAULT 0,
  reserve_percent numeric(5,2) NOT NULL DEFAULT 0,
  account_count integer NOT NULL DEFAULT 0,
  recipient_email text NOT NULL,
  recipient_name text,
  factor_company_name text,
  seller text,
  pdf_url text,
  document_ids uuid[] NOT NULL DEFAULT '{}',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_by_user_id uuid,
  submitted_by_name text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  email_message_id text,
  notes text
);

CREATE INDEX IF NOT EXISTS factoring_submissions_incident_idx ON public.factoring_submissions(incident_id);
CREATE INDEX IF NOT EXISTS factoring_submissions_org_idx ON public.factoring_submissions(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factoring_submissions TO authenticated;
GRANT ALL ON public.factoring_submissions TO service_role;

ALTER TABLE public.factoring_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY fs_select_admin ON public.factoring_submissions
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY fs_insert_admin ON public.factoring_submissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY fs_update_admin ON public.factoring_submissions
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- 4. Storage RLS for factoring-documents bucket (admin-only)
CREATE POLICY "factoring_docs_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'factoring-documents'
    AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "factoring_docs_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'factoring-documents'
    AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "factoring_docs_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'factoring-documents'
    AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "factoring_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'factoring-documents'
    AND public.is_org_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  );
