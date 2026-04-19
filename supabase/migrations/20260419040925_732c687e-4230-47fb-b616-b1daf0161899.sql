
-- 1. STORAGE: drop all broad bucket-only and public-read policies. Scoped fireops_* policies remain.
DROP POLICY IF EXISTS "Allow authenticated read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete receipts" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Inspection photos publicly readable" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated upload agreements" ON storage.objects;
DROP POLICY IF EXISTS "Public read agreements" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated upload resource-orders" ON storage.objects;
DROP POLICY IF EXISTS "Public read resource-orders" ON storage.objects;

DROP POLICY IF EXISTS "crew_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "crew_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "crew_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "crew_photos_delete" ON storage.objects;

DROP POLICY IF EXISTS "sig_read" ON storage.objects;
DROP POLICY IF EXISTS "sig_upload" ON storage.objects;

DROP POLICY IF EXISTS "td_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "td_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "td_storage_delete" ON storage.objects;

DROP POLICY IF EXISTS "tp_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tp_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "tp_storage_delete" ON storage.objects;

-- 2. ORG MEMBERS: lock UPDATE / DELETE to admins only
DROP POLICY IF EXISTS "orgmem_update" ON public.organization_members;
DROP POLICY IF EXISTS "orgmem_delete" ON public.organization_members;

CREATE POLICY "orgmem_update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Allow members to remove themselves; admins can remove anyone
CREATE POLICY "orgmem_delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_admin(auth.uid(), organization_id)
  );

-- 3. REALTIME: drop unused publication on resource_orders
ALTER PUBLICATION supabase_realtime DROP TABLE public.resource_orders;

-- 4. Harden inspection photo path parser with strict UUID validation
CREATE OR REPLACE FUNCTION public.get_truck_from_inspection_photo_path(_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _first text;
BEGIN
  _first := split_part(_path, '/', 1);
  IF _first !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN _first::uuid;
END;
$function$;
