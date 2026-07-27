CREATE TABLE public.payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  crew_member_id uuid NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric,
  pay_method text,
  paystub_sent_via text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  marked_by_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_member_id, period_start, period_end)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_payments TO authenticated;
GRANT ALL ON public.payroll_payments TO service_role;

ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll payments"
ON public.payroll_payments FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members view own payroll payments"
ON public.payroll_payments FOR SELECT TO authenticated
USING (crew_member_id = public.get_user_crew_member_id(auth.uid()));

CREATE TRIGGER payroll_payments_touch
BEFORE UPDATE ON public.payroll_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();