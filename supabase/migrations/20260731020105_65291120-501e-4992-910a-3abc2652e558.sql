UPDATE public.red_cards
SET photo_url = '2ffa93de-506d-4aa7-a53e-a3a04d9626be/a2e22f85-7164-40fb-ac21-741ad4912966/photo_david.jpeg',
    primary_position = 'FF2',
    work_capacity_test = 'Arduous',
    updated_at = now()
WHERE id = '18a1eec2-470f-4f76-8a4f-d2859f11c46b';

UPDATE public.crew_members
SET profile_photo_url = 'https://ipfuaywcilpcmguhbjmj.supabase.co/storage/v1/object/public/crew-photos/2ffa93de-506d-4aa7-a53e-a3a04d9626be/a2e22f85-7164-40fb-ac21-741ad4912966/profile_david.jpeg'
WHERE id = 'a2e22f85-7164-40fb-ac21-741ad4912966';