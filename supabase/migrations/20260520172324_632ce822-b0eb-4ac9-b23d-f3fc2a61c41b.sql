
-- Fix search_path on helper from previous migration
CREATE OR REPLACE FUNCTION public.suggest_org_email_handle(_name text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE _slug text;
BEGIN
  _slug := lower(regexp_replace(coalesce(_name,''), '[^a-zA-Z0-9]+', '-', 'g'));
  _slug := regexp_replace(_slug, '^-+|-+$', '', 'g');
  IF length(_slug) < 3 THEN _slug := _slug || 'org'; END IF;
  IF length(_slug) > 31 THEN _slug := substring(_slug from 1 for 31); END IF;
  RETURN _slug;
END;
$$;

-- =========================================================================
-- Threaded messaging
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.communication_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  incident_truck_id uuid REFERENCES public.incident_trucks(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.incident_truck_finance_contacts(id) ON DELETE SET NULL,
  finance_officer_id uuid REFERENCES public.finance_officers(id) ON DELETE SET NULL,
  purpose text NOT NULL,                 -- shift_ticket | demob | of286 | general
  subject text NOT NULL,
  thread_token text NOT NULL UNIQUE,     -- routing token in reply-to
  status text NOT NULL DEFAULT 'open',   -- open | closed
  unread_count int NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_message_direction text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ct_purpose_chk CHECK (purpose IN ('shift_ticket','demob','of286','general')),
  CONSTRAINT ct_status_chk CHECK (status IN ('open','closed'))
);
CREATE INDEX IF NOT EXISTS ct_org_idx ON public.communication_threads (organization_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS ct_truck_idx ON public.communication_threads (incident_truck_id);
CREATE INDEX IF NOT EXISTS ct_token_idx ON public.communication_threads (thread_token);
CREATE TRIGGER ct_touch BEFORE UPDATE ON public.communication_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_select" ON public.communication_threads FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "ct_insert" ON public.communication_threads FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "ct_update" ON public.communication_threads FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  direction text NOT NULL,               -- out | in
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  subject text NOT NULL,
  body_text text,
  body_html_sanitized text,
  resend_message_id text,
  in_reply_to text,
  message_references text[] NOT NULL DEFAULT '{}',
  sent_by_user_id uuid,
  read_at timestamptz,
  read_by_user_id uuid,
  is_system boolean NOT NULL DEFAULT false,
  system_event text,
  send_status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | received
  send_error text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_direction_chk CHECK (direction IN ('out','in','system')),
  CONSTRAINT msg_status_chk CHECK (send_status IN ('pending','sent','failed','received'))
);
CREATE INDEX IF NOT EXISTS msg_thread_idx ON public.messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS msg_org_idx ON public.messages (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS msg_resend_idx ON public.messages (resend_message_id) WHERE resend_message_id IS NOT NULL;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  auto_classified_as text,               -- of286 | of297 | demob | other | null
  auto_classified_stage text,            -- of286_draft_received | of286_finance_signed | null
  classification_confidence numeric,
  classification_model text,
  linked_incident_document_id uuid REFERENCES public.incident_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ma_message_idx ON public.message_attachments (message_id);
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_select" ON public.message_attachments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "ma_insert" ON public.message_attachments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "ma_update" ON public.message_attachments FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.message_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);
CREATE TRIGGER md_touch BEFORE UPDATE ON public.message_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "md_select_own" ON public.message_drafts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "md_upsert_own" ON public.message_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- Demob packets
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.demob_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  incident_truck_id uuid NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'email',   -- email | online | in_person
  status text NOT NULL DEFAULT 'draft',   -- draft | submitted | acknowledged
  thread_id uuid REFERENCES public.communication_threads(id) ON DELETE SET NULL,
  combined_pdf_path text,
  notes text,
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dp_method_chk CHECK (method IN ('email','online','in_person')),
  CONSTRAINT dp_status_chk CHECK (status IN ('draft','submitted','acknowledged'))
);
CREATE INDEX IF NOT EXISTS dp_truck_idx ON public.demob_packets (incident_truck_id);
CREATE TRIGGER dp_touch BEFORE UPDATE ON public.demob_packets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.demob_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dp_select" ON public.demob_packets FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dp_insert" ON public.demob_packets FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dp_update" ON public.demob_packets FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dp_delete" ON public.demob_packets FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.demob_packet_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid NOT NULL REFERENCES public.demob_packets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  page_number int NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dpp_packet_idx ON public.demob_packet_pages (packet_id, page_number);
ALTER TABLE public.demob_packet_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dpp_select" ON public.demob_packet_pages FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dpp_insert" ON public.demob_packet_pages FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dpp_update" ON public.demob_packet_pages FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "dpp_delete" ON public.demob_packet_pages FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- =========================================================================
-- Extend incident_documents for OF-286 round-trip + AI classification
-- =========================================================================
ALTER TABLE public.incident_documents
  ADD COLUMN IF NOT EXISTS awaiting_action_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS ai_classification jsonb,
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.communication_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS incident_truck_id uuid REFERENCES public.incident_trucks(id) ON DELETE SET NULL;

ALTER TABLE public.incident_documents
  DROP CONSTRAINT IF EXISTS incident_documents_stage_check;
ALTER TABLE public.incident_documents
  ADD CONSTRAINT incident_documents_stage_check
  CHECK (stage IN (
    'original',
    'contractor_signed',
    'finance_signed',
    'of286_draft_received',
    'of286_draft_approved',
    'of286_changes_requested',
    'of286_pending_user_signature'
  ));

-- =========================================================================
-- App notifications
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,                              -- null = visible to all org members
  type text NOT NULL,
  title text NOT NULL,
  body text,
  thread_id uuid REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  incident_truck_id uuid REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  incident_document_id uuid REFERENCES public.incident_documents(id) ON DELETE CASCADE,
  link_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_org_idx ON public.app_notifications (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_user_unread_idx ON public.app_notifications (organization_id, user_id, read_at) WHERE read_at IS NULL;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.app_notifications FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "notif_insert" ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "notif_update" ON public.app_notifications FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- =========================================================================
-- Org reply templates (per-org overrides; seeded defaults live in code)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.org_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purpose text NOT NULL,            -- shift_ticket_cover | of286_approve | of286_changes | of286_signed_return | demob_cover | quick_received | quick_will_review | quick_resend
  subject_template text,
  body_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, purpose)
);
CREATE TRIGGER ort_touch BEFORE UPDATE ON public.org_reply_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.org_reply_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ort_select" ON public.org_reply_templates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "ort_admin_write" ON public.org_reply_templates FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- =========================================================================
-- Storage buckets for communications + demob
-- =========================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('communication-attachments', 'communication-attachments', false),
  ('demob-packets', 'demob-packets', false)
ON CONFLICT (id) DO NOTHING;

-- Org-scoped storage policies: first path segment must be the org_id
CREATE POLICY "comm_attach_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'communication-attachments'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "comm_attach_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'communication-attachments'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "comm_attach_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'communication-attachments'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "demob_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'demob-packets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "demob_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'demob-packets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "demob_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'demob-packets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid())));

-- =========================================================================
-- Realtime
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_threads;
