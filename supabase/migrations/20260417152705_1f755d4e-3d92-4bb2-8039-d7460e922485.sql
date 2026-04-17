-- 1. Drop legacy public-role storage policies on receipts bucket (authenticated-role policies already exist)
DROP POLICY IF EXISTS "Allow delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;

-- 2. Tighten organization_members insert policy to prevent self-promotion into arbitrary orgs.
-- A user may only insert themselves as a member when:
--   (a) the org has no members yet (bootstrap path used by create_organization_with_owner), OR
--   (b) the inserter is already an admin of the target org (handled separately by admin invite flow).
DROP POLICY IF EXISTS orgmem_insert ON public.organization_members;

CREATE POLICY orgmem_insert
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Bootstrap: org has no members yet (used by create_organization_with_owner SECURITY DEFINER)
    NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
    -- Or the caller is already an admin of this org (admin adding themselves; rare but safe)
    OR public.is_org_admin(auth.uid(), organization_id)
  )
);