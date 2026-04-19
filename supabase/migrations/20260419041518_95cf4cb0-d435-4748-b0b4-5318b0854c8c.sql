
DROP POLICY IF EXISTS "fireops_org_prefix_insert" ON storage.objects;

CREATE POLICY "fireops_org_prefix_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['receipts','agreements','resource-orders','truck-photos','truck-documents','crew-photos'])
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      bucket_id NOT IN ('truck-photos','truck-documents')
      OR (
        (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        AND public.user_can_access_truck(auth.uid(), ((storage.foldername(name))[2])::uuid)
      )
    )
  );
