CREATE POLICY "Crew members read own red-card files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'red-cards'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.crew_member_id::text = split_part(name, '/', 2)
  )
);