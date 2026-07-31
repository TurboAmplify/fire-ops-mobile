## Current state (verified)

David Allen Morgan already has a Red Card record in Dry Lightning:
- Position: FF2, role FF 2
- Pack test: 7/06/2026, expires 7/06/2027 (Arduous)
- RT-130/190: 7/03/2026, expires 7/03/2027

What's missing: **his photo**. Both `crew_members.profile_photo_url` and `red_cards.photo_url` are empty (same gap Bryce and Arnie have; Kaylee and Stacey have theirs).

## What I'll do

1. Upload the photo you just sent to the `crew-photos` bucket under Dry Lightning / David's crew member folder (same path convention used for Kaylee and Stacey).
2. Set `red_cards.photo_url` to the storage path so it renders on his Red Card.
3. Set `crew_members.profile_photo_url` to the public URL so his crew profile shows the same photo.
4. Verify by loading his Red Card and confirming photo + FF2 + both cert lines render correctly with expiration dates.

No code changes — data and storage only.

## Note

The photo you uploaded is assumed to be David Allen Morgan. If that's actually someone else, tell me and I'll retarget it. Bryce Dougherty and Arnie Phipps are still missing photos too — send those and I'll add them the same way.
