REVOKE EXECUTE ON FUNCTION public.accept_invite_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invite_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_profile_to_invited_crew_member(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_profile_to_invited_crew_member(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_profile_to_invited_crew_member(uuid, uuid, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_signup_path() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_path() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_path() FROM authenticated;