-- ============ 1. Owner-finance access ============
CREATE TABLE public.org_finance_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  granted_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_finance_access TO authenticated;
GRANT ALL ON public.org_finance_access TO service_role;
ALTER TABLE public.org_finance_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ofa_select" ON public.org_finance_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "ofa_insert" ON public.org_finance_access FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "ofa_update" ON public.org_finance_access FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "ofa_delete" ON public.org_finance_access FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.is_org_finance(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.org_finance_access
      WHERE user_id = _user_id AND organization_id = _org_id
    )
$$;

-- ============ 2. Incident financial status ============
CREATE TABLE public.incident_financial_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL UNIQUE REFERENCES public.incidents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_factored'
    CHECK (status IN ('not_factored','factored','paid')),
  factored_at timestamp with time zone,
  paid_at timestamp with time zone,
  last_schedule_number integer,
  factor_name text,
  amount_submitted numeric(14,2),
  invoice_numbers text[] NOT NULL DEFAULT '{}',
  last_source text,
  notes text,
  set_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ifs_org ON public.incident_financial_status (organization_id);
CREATE INDEX idx_ifs_incident ON public.incident_financial_status (incident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_financial_status TO authenticated;
GRANT ALL ON public.incident_financial_status TO service_role;
ALTER TABLE public.incident_financial_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ifs_select" ON public.incident_financial_status FOR SELECT TO authenticated
  USING (public.is_org_finance(auth.uid(), organization_id));
CREATE POLICY "ifs_insert" ON public.incident_financial_status FOR INSERT TO authenticated
  WITH CHECK (public.is_org_finance(auth.uid(), organization_id));
CREATE POLICY "ifs_update" ON public.incident_financial_status FOR UPDATE TO authenticated
  USING (public.is_org_finance(auth.uid(), organization_id))
  WITH CHECK (public.is_org_finance(auth.uid(), organization_id));
CREATE POLICY "ifs_delete" ON public.incident_financial_status FOR DELETE TO authenticated
  USING (public.is_org_finance(auth.uid(), organization_id));

CREATE TRIGGER trg_ifs_touch BEFORE UPDATE ON public.incident_financial_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 3. Audit history ============
CREATE TABLE public.incident_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  schedule_number integer,
  factor_name text,
  amount numeric(14,2),
  submission_id uuid,
  notes text,
  actor_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ife_incident ON public.incident_financial_events (incident_id, created_at DESC);

GRANT SELECT, INSERT ON public.incident_financial_events TO authenticated;
GRANT ALL ON public.incident_financial_events TO service_role;
ALTER TABLE public.incident_financial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ife_select" ON public.incident_financial_events FOR SELECT TO authenticated
  USING (public.is_org_finance(auth.uid(), organization_id));
CREATE POLICY "ife_insert" ON public.incident_financial_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_finance(auth.uid(), organization_id));

-- ============ 4. Single service entry point for status changes ============
CREATE OR REPLACE FUNCTION public.set_incident_financial_status(
  _incident_id uuid,
  _status text,
  _notes text DEFAULT NULL,
  _source text DEFAULT 'manual',
  _force boolean DEFAULT false
)
RETURNS public.incident_financial_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org uuid;
  _prev text;
  _outstanding integer;
  _row public.incident_financial_status;
BEGIN
  IF _status NOT IN ('not_factored','factored','paid') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT organization_id INTO _org FROM public.incidents WHERE id = _incident_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'incident_not_found'; END IF;

  IF NOT public.is_org_finance(auth.uid(), _org) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT status INTO _prev FROM public.incident_financial_status WHERE incident_id = _incident_id;

  -- Roll-up guard: don't close an incident while factored invoices remain outstanding.
  IF _status = 'paid' AND NOT _force THEN
    SELECT count(*) INTO _outstanding
      FROM public.factoring_submissions
     WHERE incident_id = _incident_id AND reserve_released_at IS NULL;
    IF _outstanding > 0 THEN
      RAISE EXCEPTION 'outstanding_submissions:%', _outstanding;
    END IF;
  END IF;

  INSERT INTO public.incident_financial_status AS s
    (organization_id, incident_id, status, notes, last_source, set_by_user_id,
     factored_at, paid_at)
  VALUES (_org, _incident_id, _status, _notes, _source, auth.uid(),
          CASE WHEN _status = 'factored' THEN now() END,
          CASE WHEN _status = 'paid' THEN now() END)
  ON CONFLICT (incident_id) DO UPDATE
    SET status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, s.notes),
        last_source = EXCLUDED.last_source,
        set_by_user_id = EXCLUDED.set_by_user_id,
        factored_at = CASE
          WHEN EXCLUDED.status = 'not_factored' THEN NULL
          WHEN s.factored_at IS NULL AND EXCLUDED.status IN ('factored','paid') THEN now()
          ELSE s.factored_at END,
        paid_at = CASE WHEN EXCLUDED.status = 'paid' THEN COALESCE(s.paid_at, now()) ELSE NULL END,
        updated_at = now()
  RETURNING s.* INTO _row;

  INSERT INTO public.incident_financial_events
    (organization_id, incident_id, from_status, to_status, source, notes, actor_user_id)
  VALUES (_org, _incident_id, _prev, _status,
          CASE WHEN _force THEN _source || '_forced' ELSE _source END,
          _notes, auth.uid());

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_incident_financial_status(uuid, text, text, text, boolean) TO authenticated;

-- ============ 5. Automatic trigger from any factoring submission ============
CREATE OR REPLACE FUNCTION public.mark_incident_factored_on_submission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _prev text;
  _invoices text[];
BEGIN
  SELECT status INTO _prev FROM public.incident_financial_status WHERE incident_id = NEW.incident_id;

  SELECT COALESCE(array_agg(DISTINCT li ->> 'invoice_number')
                    FILTER (WHERE COALESCE(li ->> 'invoice_number','') <> ''), '{}')
    INTO _invoices
    FROM jsonb_array_elements(COALESCE(NEW.line_items, '[]'::jsonb)) li;

  INSERT INTO public.incident_financial_status AS s
    (organization_id, incident_id, status, factored_at, last_schedule_number,
     factor_name, amount_submitted, invoice_numbers, last_source, set_by_user_id)
  VALUES (NEW.organization_id, NEW.incident_id, 'factored', NEW.submitted_at, NEW.schedule_number,
          NEW.factor_company_name, NEW.total_amount, _invoices,
          'schedule_submission', NEW.submitted_by_user_id)
  ON CONFLICT (incident_id) DO UPDATE
    SET status = 'factored',
        factored_at = COALESCE(s.factored_at, NEW.submitted_at),
        paid_at = NULL,
        last_schedule_number = NEW.schedule_number,
        factor_name = COALESCE(NEW.factor_company_name, s.factor_name),
        amount_submitted = COALESCE(s.amount_submitted, 0) + NEW.total_amount,
        invoice_numbers = (
          SELECT COALESCE(array_agg(DISTINCT x), '{}')
          FROM unnest(s.invoice_numbers || _invoices) x
        ),
        last_source = 'schedule_submission',
        set_by_user_id = NEW.submitted_by_user_id,
        updated_at = now();

  INSERT INTO public.incident_financial_events
    (organization_id, incident_id, from_status, to_status, source, schedule_number,
     factor_name, amount, submission_id, actor_user_id)
  VALUES (NEW.organization_id, NEW.incident_id, _prev, 'factored', 'schedule_submission',
          NEW.schedule_number, NEW.factor_company_name, NEW.total_amount, NEW.id,
          NEW.submitted_by_user_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_factoring_submission_marks_incident
AFTER INSERT ON public.factoring_submissions
FOR EACH ROW EXECUTE FUNCTION public.mark_incident_factored_on_submission();
