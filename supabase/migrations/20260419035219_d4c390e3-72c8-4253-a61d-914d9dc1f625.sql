
-- 1) Make all 8 buckets private
UPDATE storage.buckets SET public = false
WHERE id IN (
  'receipts','agreements','resource-orders','truck-photos',
  'truck-documents','crew-photos','signatures','inspection-photos'
);

-- 2) Helper: get org_id for a signatures path (first segment is shift_ticket_id)
CREATE OR REPLACE FUNCTION public.get_org_from_signature_path(_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT st.organization_id
  FROM shift_tickets st
  WHERE st.id::text = split_part(_path, '/', 1)
  LIMIT 1
$$;

-- 3) Helper: get truck_id for an inspection-photos path (first segment is truck_id)
CREATE OR REPLACE FUNCTION public.get_truck_from_inspection_photo_path(_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (split_part(_path, '/', 1))::uuid
$$;

-- 4) Drop any existing policies on storage.objects for these buckets so we start clean
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'fireops_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 5) Org-prefixed buckets: first folder segment must be the org_id the user belongs to
-- Buckets: receipts, agreements, resource-orders, truck-photos, truck-documents, crew-photos
CREATE POLICY "fireops_org_prefix_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('receipts','agreements','resource-orders','truck-photos','truck-documents','crew-photos')
  AND (
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "fireops_org_prefix_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('receipts','agreements','resource-orders','truck-photos','truck-documents','crew-photos')
  AND (
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "fireops_org_prefix_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('receipts','agreements','resource-orders','truck-photos','truck-documents','crew-photos')
  AND (
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "fireops_org_prefix_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('receipts','agreements','resource-orders','truck-photos','truck-documents','crew-photos')
  AND (
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

-- 6) Signatures bucket: path = {shift_ticket_id}/...; allow members of the ticket's org
CREATE POLICY "fireops_signatures_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND public.get_org_from_signature_path(name) IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "fireops_signatures_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND public.get_org_from_signature_path(name) IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "fireops_signatures_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'signatures'
  AND public.get_org_from_signature_path(name) IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "fireops_signatures_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'signatures'
  AND public.get_org_from_signature_path(name) IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- 7) Inspection photos: path = {truck_id}/...; allow users with truck access
CREATE POLICY "fireops_inspection_photos_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND public.user_can_access_truck(auth.uid(), public.get_truck_from_inspection_photo_path(name))
);

CREATE POLICY "fireops_inspection_photos_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos'
  AND public.user_can_access_truck(auth.uid(), public.get_truck_from_inspection_photo_path(name))
);

CREATE POLICY "fireops_inspection_photos_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND public.user_can_access_truck(auth.uid(), public.get_truck_from_inspection_photo_path(name))
);

CREATE POLICY "fireops_inspection_photos_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND public.user_can_access_truck(auth.uid(), public.get_truck_from_inspection_photo_path(name))
);
