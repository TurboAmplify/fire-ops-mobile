
UPDATE red_cards
SET issue_date = '2026-05-27',
    review_expiration_date = '2028-05-28',
    rt130_refresher_status = '2026-04-25',
    updated_at = now()
WHERE crew_member_id IN (
  '56191095-7c74-4294-b558-ff895a99f051',
  '9eac04fd-226a-4321-93c2-9325b6334b4f',
  '45b36cd8-e8de-4c72-a302-8ff46e52a272',
  '0f683191-d2a8-4927-a2a8-694bbc877097'
);
