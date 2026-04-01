
-- Create shift_tickets table for OF-297 form data
CREATE TABLE public.shift_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_truck_id uuid NOT NULL REFERENCES public.incident_trucks(id) ON DELETE CASCADE,
  resource_order_id uuid REFERENCES public.resource_orders(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',

  -- Header fields (1-10)
  agreement_number text,
  contractor_name text,
  resource_order_number text,
  incident_name text,
  incident_number text,
  financial_code text,
  equipment_make_model text,
  equipment_type text,
  serial_vin_number text,
  license_id_number text,

  -- Flags (11-13)
  transport_retained boolean DEFAULT false,
  is_first_last boolean DEFAULT false,
  first_last_type text, -- 'mobilization' or 'demobilization'
  miles numeric,

  -- Equipment rows (JSON array of {date, start, stop, total, quantity, type, remarks})
  equipment_entries jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Personnel rows (JSON array of {date, operator_name, op_start, op_stop, sb_start, sb_stop, total, remarks})
  personnel_entries jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Remarks (30)
  remarks text,

  -- Signatures (31-34)
  contractor_rep_name text,
  contractor_rep_signature_url text,
  contractor_rep_signed_at timestamptz,
  supervisor_name text,
  supervisor_resource_order text,
  supervisor_signature_url text,
  supervisor_signed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shift_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies using org helper
CREATE POLICY "st_select" ON public.shift_tickets
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "st_insert" ON public.shift_tickets
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "st_update" ON public.shift_tickets
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "st_delete" ON public.shift_tickets
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true);

-- Storage RLS for signatures bucket
CREATE POLICY "sig_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "sig_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'signatures');
