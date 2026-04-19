
-- Tighten organization_members INSERT: must be admin of the org, or accepting a valid invite
DROP POLICY IF EXISTS "orgmem_insert" ON public.organization_members;

CREATE POLICY "orgmem_insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admins can add members directly
    public.is_org_admin(auth.uid(), organization_id)
    OR (
      -- Or the user is accepting a valid pending invite addressed to their email
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.organization_invites oi
        WHERE oi.organization_id = organization_members.organization_id
          AND oi.email = public.get_auth_email()
          AND oi.status = 'pending'
          AND oi.expires_at > now()
          AND oi.role = organization_members.role
      )
    )
  );

-- Allow same-org members to read each other's profile (name, photo)
CREATE POLICY "profiles_select_same_org" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members me
      JOIN public.organization_members other
        ON other.organization_id = me.organization_id
      WHERE me.user_id = auth.uid()
        AND other.user_id = profiles.id
    )
  );
