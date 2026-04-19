
DROP POLICY IF EXISTS "fireops_org_prefix_select" ON storage.objects;
DROP POLICY IF EXISTS "fireops_org_prefix_update" ON storage.objects;
DROP POLICY IF EXISTS "fireops_org_prefix_delete" ON storage.objects;

-- Helper: extract the truck_id (second path segment) and check truck access
-- Truck files live at <org_id>/<truck_id>/...
-- All other buckets only need org membership.

CREATE POLICY "fireops_org_prefix_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
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

CREATE POLICY "fireops_org_prefix_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
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

CREATE POLICY "fireops_org_prefix_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
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
