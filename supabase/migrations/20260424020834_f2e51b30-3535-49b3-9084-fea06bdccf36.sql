-- Payroll adjustments table
CREATE TABLE public.payroll_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  crew_member_id uuid NOT NULL,
  incident_id uuid,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('hours','flat')),
  hours numeric,
  amount numeric,
  reason text NOT NULL,
  created_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_adj_org ON public.payroll_adjustments(organization_id);
CREATE INDEX idx_payroll_adj_crew ON public.payroll_adjustments(crew_member_id);
CREATE INDEX idx_payroll_adj_date ON public.payroll_adjustments(adjustment_date);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pa_select_admin ON public.payroll_adjustments
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY pa_insert_admin ON public.payroll_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY pa_delete_admin ON public.payroll_adjustments
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY pa_update_admin ON public.payroll_adjustments
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Audit table (append-only)
CREATE TABLE public.payroll_adjustment_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  adjustment_id uuid,
  crew_member_id uuid,
  incident_id uuid,
  event_type text NOT NULL,
  actor_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_paa_org ON public.payroll_adjustment_audit(organization_id);
CREATE INDEX idx_paa_adj ON public.payroll_adjustment_audit(adjustment_id);

ALTER TABLE public.payroll_adjustment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY paa_select_admin ON public.payroll_adjustment_audit
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY paa_no_insert ON public.payroll_adjustment_audit
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY paa_no_update ON public.payroll_adjustment_audit
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY paa_no_delete ON public.payroll_adjustment_audit
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- Audit triggers
CREATE OR REPLACE FUNCTION public.payroll_adjustment_audit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.payroll_adjustment_audit
    (organization_id, adjustment_id, crew_member_id, incident_id, event_type, actor_user_id, payload)
  VALUES (
    NEW.organization_id,
    NEW.id,
    NEW.crew_member_id,
    NEW.incident_id,
    'created',
    auth.uid(),
    jsonb_build_object(
      'adjustment_type', NEW.adjustment_type,
      'hours', NEW.hours,
      'amount', NEW.amount,
      'adjustment_date', NEW.adjustment_date,
      'reason', NEW.reason
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_adjustment_audit_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.payroll_adjustment_audit
    (organization_id, adjustment_id, crew_member_id, incident_id, event_type, actor_user_id, payload)
  VALUES (
    OLD.organization_id,
    OLD.id,
    OLD.crew_member_id,
    OLD.incident_id,
    'deleted',
    auth.uid(),
    jsonb_build_object(
      'adjustment_type', OLD.adjustment_type,
      'hours', OLD.hours,
      'amount', OLD.amount,
      'adjustment_date', OLD.adjustment_date,
      'reason', OLD.reason
    )
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_payroll_adj_audit_insert
  AFTER INSERT ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.payroll_adjustment_audit_insert();

CREATE TRIGGER trg_payroll_adj_audit_delete
  AFTER DELETE ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.payroll_adjustment_audit_delete();