
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('2ffa93de-506d-4aa7-a53e-a3a04d9626be', 'c4f31e15-fb7a-4133-80be-4f33b171d9eb', 'crew_member')
ON CONFLICT (organization_id, user_id) DO NOTHING;

UPDATE public.organization_invites SET status='expired', expires_at = now() WHERE id='8561e3dd-87a5-4f8b-84e9-bc05d29b871b' AND status='pending';
