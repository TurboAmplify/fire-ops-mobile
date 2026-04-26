
-- incident_documents table
CREATE TABLE public.incident_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'of286',
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_documents_incident ON public.incident_documents(incident_id);
CREATE INDEX idx_incident_documents_type ON public.incident_documents(incident_id, document_type);

ALTER TABLE public.incident_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY idoc_select ON public.incident_documents
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY idoc_insert ON public.incident_documents
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY idoc_update ON public.incident_documents
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY idoc_delete ON public.incident_documents
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-documents', 'incident-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: scope by org id (first folder segment)
CREATE POLICY "incident_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'incident-documents'
    AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "incident_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'incident-documents'
    AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "incident_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'incident-documents'
    AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  );
