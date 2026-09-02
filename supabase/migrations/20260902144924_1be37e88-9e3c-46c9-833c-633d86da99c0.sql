REVOKE ALL ON FUNCTION public.is_org_finance(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_incident_financial_status(uuid, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_incident_factored_on_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_finance(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_incident_financial_status(uuid, text, text, text, boolean) TO authenticated, service_role;
