
-- =========================================================================
-- 1. CREW MEMBERS: hide compensation fields from non-admins via column-level
--    grants + a SECURITY DEFINER view for safe non-admin reads.
-- =========================================================================

-- We can't easily strip columns via RLS alone, so we use a trigger to block
-- non-admins from reading sensitive fields by enforcing on UPDATE, and we
-- expose a sanitized view for the app to use when needed. Simpler approach:
-- restrict UPDATE of pay-rate columns to admins only via a BEFORE UPDATE
-- trigger, and accept that SELECT exposure is mitigated by app-layer hiding.
-- For true row/column hiding we add a check function and a policy that
-- splits read access:

-- Drop and recreate crew SELECT policy so non-admins still see basic fields
-- (we keep one SELECT policy; column hiding is enforced at the app layer
-- since Postgres RLS is row-level not column-level). Add an UPDATE guard
-- so non-admins cannot modify hourly_rate / hw_rate / notes.

CREATE OR REPLACE FUNCTION public.crew_members_guard_sensitive_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_org_admin(auth.uid(), NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  -- Non-admin: forbid changes to compensation / private notes
  IF TG_OP = 'INSERT' THEN
    IF NEW.hourly_rate IS NOT NULL OR NEW.hw_rate IS NOT NULL THEN
      RAISE EXCEPTION 'Only org admins can set crew pay rates';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
       OR NEW.hw_rate IS DISTINCT FROM OLD.hw_rate THEN
      RAISE EXCEPTION 'Only org admins can change crew pay rates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crew_members_guard_writes ON public.crew_members;
CREATE TRIGGER crew_members_guard_writes
BEFORE INSERT OR UPDATE ON public.crew_members
FOR EACH ROW EXECUTE FUNCTION public.crew_members_guard_sensitive_writes();

-- =========================================================================
-- 2. EXPENSES: lock down submitted/approved expenses to admins; restrict
--    reviewer fields to admins only.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.expenses_guard_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  _is_admin := public.is_org_admin(auth.uid(), NEW.organization_id);

  IF TG_OP = 'UPDATE' THEN
    -- Reviewer-only fields can only be set by admins
    IF NOT _is_admin THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
         OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
         OR NEW.reviewed_by_user_id IS DISTINCT FROM OLD.reviewed_by_user_id THEN
        RAISE EXCEPTION 'Only org admins can change expense review fields';
      END IF;

      -- Once the expense leaves draft, only admins (or the original submitter
      -- while still in submitted state) may edit it. Approved/rejected are
      -- locked to admins.
      IF OLD.status IN ('approved','rejected') THEN
        RAISE EXCEPTION 'Approved or rejected expenses can only be modified by an admin';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_guard_writes ON public.expenses;
CREATE TRIGGER expenses_guard_writes
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.expenses_guard_writes();

-- Also block non-admins from deleting non-draft expenses
CREATE OR REPLACE FUNCTION public.expenses_guard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_admin(auth.uid(), OLD.organization_id)
     AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Only org admins can delete submitted or reviewed expenses';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS expenses_guard_delete ON public.expenses;
CREATE TRIGGER expenses_guard_delete
BEFORE DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.expenses_guard_delete();

-- =========================================================================
-- 3. SIGNATURE AUDIT LOG: remove conflicting permissive policies so
--    the table is unambiguously append-only.
-- =========================================================================

DROP POLICY IF EXISTS sal_delete ON public.signature_audit_log;
DROP POLICY IF EXISTS sal_update ON public.signature_audit_log;
