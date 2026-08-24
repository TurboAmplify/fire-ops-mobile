CREATE POLICY fireops_signatures_evals_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND split_part(name, '/', 1) = 'evals'
  AND EXISTS (
    SELECT 1 FROM public.personnel_evals e
    WHERE e.id::text = split_part(storage.objects.name, '/', 2)
      AND e.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY fireops_signatures_evals_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND split_part(name, '/', 1) = 'evals'
  AND EXISTS (
    SELECT 1 FROM public.personnel_evals e
    WHERE e.id::text = split_part(storage.objects.name, '/', 2)
      AND e.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY fireops_signatures_evals_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'signatures'
  AND split_part(name, '/', 1) = 'evals'
  AND EXISTS (
    SELECT 1 FROM public.personnel_evals e
    WHERE e.id::text = split_part(storage.objects.name, '/', 2)
      AND e.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);