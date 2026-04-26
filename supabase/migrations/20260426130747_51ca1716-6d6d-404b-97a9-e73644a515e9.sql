-- 1. Add missing UPDATE storage policy for incident-documents bucket (org-scoped)
CREATE POLICY "incident_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'incident-documents'
  AND (split_part(name, '/', 1))::uuid IN (
    SELECT get_user_org_ids(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'incident-documents'
  AND (split_part(name, '/', 1))::uuid IN (
    SELECT get_user_org_ids(auth.uid())
  )
);

-- 2. Harden organization_members insert: prevent duplicate membership rows
-- and ensure the invite hasn't been accepted/revoked. Drop and recreate the
-- self-join INSERT policy so users can only add themselves once per org via
-- a still-pending, unexpired invite that matches the role being claimed.
DROP POLICY IF EXISTS "orgmem_insert" ON public.organization_members;

CREATE POLICY "orgmem_insert"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins of the org can add anyone
  is_org_admin(auth.uid(), organization_id)
  OR (
    -- Self-join: must be inserting yourself
    user_id = auth.uid()
    -- and a matching pending, unexpired invite must exist for your email + role
    AND EXISTS (
      SELECT 1
      FROM public.organization_invites oi
      WHERE oi.organization_id = organization_members.organization_id
        AND oi.email = get_auth_email()
        AND oi.status = 'pending'
        AND oi.expires_at > now()
        AND oi.role = organization_members.role
    )
    -- and you aren't already a member (prevents replay/duplicate insert)
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.user_id = auth.uid()
    )
  )
);

-- 3. Add a unique constraint as defense-in-depth so duplicate (org, user)
-- membership rows can never exist regardless of policy outcome.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_members_org_user_unique'
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_org_user_unique
      UNIQUE (organization_id, user_id);
  END IF;
END $$;