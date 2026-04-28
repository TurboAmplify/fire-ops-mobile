-- =============================================================================
-- DEFENSE-IN-DEPTH: Database-level input validation
-- All constraints added with NOT VALID to avoid breaking existing rows,
-- then we VALIDATE only the ones safe to enforce retroactively.
-- =============================================================================

-- ============ EXPENSES ============
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_range_chk
  CHECK (amount >= 0 AND amount <= 1000000) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_vendor_len_chk
  CHECK (vendor IS NULL OR length(vendor) <= 255) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_description_len_chk
  CHECK (description IS NULL OR length(description) <= 5000) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_review_notes_len_chk
  CHECK (review_notes IS NULL OR length(review_notes) <= 5000) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_meal_attendees_len_chk
  CHECK (meal_attendees IS NULL OR length(meal_attendees) <= 1000) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_meal_purpose_len_chk
  CHECK (meal_purpose IS NULL OR length(meal_purpose) <= 1000) NOT VALID;

-- ============ INCIDENTS ============
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_containment_range_chk
  CHECK (containment IS NULL OR (containment >= 0 AND containment <= 100)) NOT VALID;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_acres_nonneg_chk
  CHECK (acres IS NULL OR acres >= 0) NOT VALID;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_name_len_chk
  CHECK (length(name) <= 255) NOT VALID;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_location_len_chk
  CHECK (length(location) <= 500) NOT VALID;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_notes_len_chk
  CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID;

-- ============ CREW MEMBERS ============
ALTER TABLE public.crew_members
  ADD CONSTRAINT crew_members_name_len_chk
  CHECK (length(name) BETWEEN 1 AND 255) NOT VALID;

ALTER TABLE public.crew_members
  ADD CONSTRAINT crew_members_phone_len_chk
  CHECK (phone IS NULL OR length(phone) <= 50) NOT VALID;

ALTER TABLE public.crew_members
  ADD CONSTRAINT crew_members_role_len_chk
  CHECK (length(role) <= 100) NOT VALID;

ALTER TABLE public.crew_members
  ADD CONSTRAINT crew_members_notes_len_chk
  CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID;

-- ============ TRUCKS ============
-- Note: trucks table columns inferred from form; only constraining what definitely exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='year') THEN
    EXECUTE 'ALTER TABLE public.trucks ADD CONSTRAINT trucks_year_range_chk CHECK (year IS NULL OR (year BETWEEN 1900 AND 2100)) NOT VALID';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='vin') THEN
    EXECUTE 'ALTER TABLE public.trucks ADD CONSTRAINT trucks_vin_len_chk CHECK (vin IS NULL OR length(vin) <= 17) NOT VALID';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='license_plate') THEN
    EXECUTE 'ALTER TABLE public.trucks ADD CONSTRAINT trucks_plate_len_chk CHECK (license_plate IS NULL OR length(license_plate) <= 20) NOT VALID';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='notes') THEN
    EXECUTE 'ALTER TABLE public.trucks ADD CONSTRAINT trucks_notes_len_chk CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID';
  END IF;
END $$;

-- ============ ORG PAYROLL SETTINGS ============
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_federal_pct_range_chk CHECK (federal_pct >= 0 AND federal_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_state_pct_range_chk CHECK (state_pct >= 0 AND state_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_medicare_pct_range_chk CHECK (medicare_pct >= 0 AND medicare_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_ss_pct_range_chk CHECK (social_security_pct >= 0 AND social_security_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_wc_pct_range_chk CHECK (workers_comp_pct >= 0 AND workers_comp_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_factoring_pct_range_chk CHECK (factoring_pct >= 0 AND factoring_pct <= 100) NOT VALID;
ALTER TABLE public.org_payroll_settings
  ADD CONSTRAINT ops_extra_wh_nonneg_chk CHECK (extra_withholding_default >= 0) NOT VALID;

-- ============ CREW COMPENSATION ============
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_hourly_rate_nonneg_chk CHECK (hourly_rate IS NULL OR hourly_rate >= 0) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_daily_rate_nonneg_chk CHECK (daily_rate IS NULL OR daily_rate >= 0) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_hw_rate_nonneg_chk CHECK (hw_rate IS NULL OR hw_rate >= 0) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_extra_wh_nonneg_chk CHECK (extra_withholding >= 0) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_other_ded_nonneg_chk CHECK (other_deductions >= 0) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_dependents_nonneg_chk CHECK (dependents_count >= 0 AND dependents_count <= 50) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_fed_override_range_chk CHECK (federal_pct_override IS NULL OR (federal_pct_override >= 0 AND federal_pct_override <= 100)) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_state_override_range_chk CHECK (state_pct_override IS NULL OR (state_pct_override >= 0 AND state_pct_override <= 100)) NOT VALID;
ALTER TABLE public.crew_compensation
  ADD CONSTRAINT cc_notes_len_chk CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID;

-- ============ ORG ROLE DEFAULT RATES ============
ALTER TABLE public.org_role_default_rates
  ADD CONSTRAINT ordr_hourly_nonneg_chk CHECK (hourly_rate IS NULL OR hourly_rate >= 0) NOT VALID;
ALTER TABLE public.org_role_default_rates
  ADD CONSTRAINT ordr_daily_nonneg_chk CHECK (daily_rate IS NULL OR daily_rate >= 0) NOT VALID;
ALTER TABLE public.org_role_default_rates
  ADD CONSTRAINT ordr_hw_nonneg_chk CHECK (hw_rate IS NULL OR hw_rate >= 0) NOT VALID;

-- ============ SHIFT CREW ============
ALTER TABLE public.shift_crew
  ADD CONSTRAINT sc_hours_range_chk CHECK (hours >= 0 AND hours <= 24) NOT VALID;
ALTER TABLE public.shift_crew
  ADD CONSTRAINT sc_notes_len_chk CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID;

-- ============ SHIFT TICKETS ============
ALTER TABLE public.shift_tickets
  ADD CONSTRAINT st_remarks_len_chk CHECK (remarks IS NULL OR length(remarks) <= 20000) NOT VALID;
ALTER TABLE public.shift_tickets
  ADD CONSTRAINT st_miles_nonneg_chk CHECK (miles IS NULL OR miles >= 0) NOT VALID;
ALTER TABLE public.shift_tickets
  ADD CONSTRAINT st_incident_name_len_chk CHECK (incident_name IS NULL OR length(incident_name) <= 255) NOT VALID;
ALTER TABLE public.shift_tickets
  ADD CONSTRAINT st_contractor_name_len_chk CHECK (contractor_name IS NULL OR length(contractor_name) <= 255) NOT VALID;
ALTER TABLE public.shift_tickets
  ADD CONSTRAINT st_supervisor_name_len_chk CHECK (supervisor_name IS NULL OR length(supervisor_name) <= 255) NOT VALID;

-- ============ NEEDS LIST ============
ALTER TABLE public.needs_list_items
  ADD CONSTRAINT needs_title_len_chk CHECK (length(title) BETWEEN 1 AND 255) NOT VALID;
ALTER TABLE public.needs_list_items
  ADD CONSTRAINT needs_notes_len_chk CHECK (notes IS NULL OR length(notes) <= 5000) NOT VALID;

-- ============ PAYROLL ADJUSTMENTS ============
ALTER TABLE public.payroll_adjustments
  ADD CONSTRAINT pa_hours_range_chk CHECK (hours IS NULL OR (hours >= -24 AND hours <= 24)) NOT VALID;
ALTER TABLE public.payroll_adjustments
  ADD CONSTRAINT pa_amount_range_chk CHECK (amount IS NULL OR (amount >= -100000 AND amount <= 100000)) NOT VALID;
ALTER TABLE public.payroll_adjustments
  ADD CONSTRAINT pa_reason_len_chk CHECK (length(reason) BETWEEN 1 AND 5000) NOT VALID;

-- =============================================================================
-- VALIDATE constraints (skips invalid existing rows; enforces on new writes).
-- We wrap each in DO blocks so one failing validation doesn't abort the rest.
-- =============================================================================
DO $$
DECLARE
  c text;
  constraints text[] := ARRAY[
    'expenses|expenses_amount_range_chk',
    'expenses|expenses_vendor_len_chk',
    'expenses|expenses_description_len_chk',
    'expenses|expenses_review_notes_len_chk',
    'expenses|expenses_meal_attendees_len_chk',
    'expenses|expenses_meal_purpose_len_chk',
    'incidents|incidents_containment_range_chk',
    'incidents|incidents_acres_nonneg_chk',
    'incidents|incidents_name_len_chk',
    'incidents|incidents_location_len_chk',
    'incidents|incidents_notes_len_chk',
    'crew_members|crew_members_name_len_chk',
    'crew_members|crew_members_phone_len_chk',
    'crew_members|crew_members_role_len_chk',
    'crew_members|crew_members_notes_len_chk',
    'org_payroll_settings|ops_federal_pct_range_chk',
    'org_payroll_settings|ops_state_pct_range_chk',
    'org_payroll_settings|ops_medicare_pct_range_chk',
    'org_payroll_settings|ops_ss_pct_range_chk',
    'org_payroll_settings|ops_wc_pct_range_chk',
    'org_payroll_settings|ops_factoring_pct_range_chk',
    'org_payroll_settings|ops_extra_wh_nonneg_chk',
    'crew_compensation|cc_hourly_rate_nonneg_chk',
    'crew_compensation|cc_daily_rate_nonneg_chk',
    'crew_compensation|cc_hw_rate_nonneg_chk',
    'crew_compensation|cc_extra_wh_nonneg_chk',
    'crew_compensation|cc_other_ded_nonneg_chk',
    'crew_compensation|cc_dependents_nonneg_chk',
    'crew_compensation|cc_fed_override_range_chk',
    'crew_compensation|cc_state_override_range_chk',
    'crew_compensation|cc_notes_len_chk',
    'org_role_default_rates|ordr_hourly_nonneg_chk',
    'org_role_default_rates|ordr_daily_nonneg_chk',
    'org_role_default_rates|ordr_hw_nonneg_chk',
    'shift_crew|sc_hours_range_chk',
    'shift_crew|sc_notes_len_chk',
    'shift_tickets|st_remarks_len_chk',
    'shift_tickets|st_miles_nonneg_chk',
    'shift_tickets|st_incident_name_len_chk',
    'shift_tickets|st_contractor_name_len_chk',
    'shift_tickets|st_supervisor_name_len_chk',
    'needs_list_items|needs_title_len_chk',
    'needs_list_items|needs_notes_len_chk',
    'payroll_adjustments|pa_hours_range_chk',
    'payroll_adjustments|pa_amount_range_chk',
    'payroll_adjustments|pa_reason_len_chk'
  ];
  parts text[];
BEGIN
  FOREACH c IN ARRAY constraints LOOP
    parts := string_to_array(c, '|');
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', parts[1], parts[2]);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped validation for %.%: %', parts[1], parts[2], SQLERRM;
    END;
  END LOOP;

  -- Truck constraints (added conditionally above)
  FOR c IN SELECT unnest(ARRAY['trucks_year_range_chk','trucks_vin_len_chk','trucks_plate_len_chk','trucks_notes_len_chk']) LOOP
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c AND conrelid = 'public.trucks'::regclass) THEN
        EXECUTE format('ALTER TABLE public.trucks VALIDATE CONSTRAINT %I', c);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped validation for trucks.%: %', c, SQLERRM;
    END;
  END LOOP;
END $$;