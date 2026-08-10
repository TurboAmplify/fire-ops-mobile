# IBPA Training Information Collection

A temporary, public (no-login) form for Dry Lightning crew members to submit the training details missing from the USDA/IBPA Training Verification Form, plus an admin-only review and export page. Nothing in existing crew, red card, or training records is read-write — submissions land in a new, separate table.

## What gets built

### 1. Public form — `/training-form` (no login)
Title: "Dry Lightning Training Information", with the intro text you provided. Mobile-first: one step at a time, large tap targets, native date pickers, "I don't know / can't find this date" next to every date.

Steps:
1. **Select your name** — searchable dropdown of active Dry Lightning crew, excluding Brandon Aldrich and Justin Richardson and anyone who already submitted. The list comes from the server, so completions disappear on every phone/browser.
2. **Identity** — legal first / middle (+ "No middle name") / last, email, phone auto-formatted to XXX-XXX-XXXX, prior IBPA form Yes/No/I don't know, Verification ID (+ "I don't know my Verification ID"), and the government-ID name confirmation checkbox.
3. **Role confirmation** — shows "Our records list your role/qualifications as: …" from the crew record (role + red card position/quals). Yes / No / I'm not sure; No or unsure opens the multi-select (FFT2, FFT1, ENGB, Faller, Medical, Water Handling, None, Not sure). Any correction or uncertainty is flagged for admin review. Roster job title alone never implies a qualification — ENGB questions still ask for confirmation.
4. **Agreement categories** — Water Handling / Faller / Medical / None / Not sure.
5. **Annual training** — RT-130 date (note that a new firefighter may use S-130), WCT date, and "Was this an Arduous WCT?" Yes/No/Not sure.
6. **FFT2 block** (shown when recorded or selected FFT2, or a higher qual implies it) — S-130, S-190, ICS-100 (+ online? + provider dropdown), IS-700a (+ online? + provider dropdown), L-180.
7. **FFT1 block** — S-131/S-133, FFT1 taskbook certification date.
8. **ENGB block** — ICS-200 (+ online? + provider dropdown), S-230, S-290, ENGB taskbook certification date.
9. **Review & submit** — full summary including every "I don't know", the certification checkbox, button "Submit My Training Information", then the thank-you screen. Submit button locks during save to prevent duplicates.

Provider dropdown (only for courses marked online/other): FEMA, NWCG, Another provider (free-text name), I don't know. Dry Lightning–provided courses automatically record provider "Dry Lightning Wildland Firefighters LLC", instructor Dustin Aldrich, phone 605-891-8916 — never asked of the crew member.

### 2. Admin page — More → "IBPA Training Collection" at `/admin/ibpa-training`
Admin-only, inside the authenticated app. Shows requested / completed / remaining counts, completed and remaining lists, submission timestamps, recorded vs. confirmed role, a "needs review" flag for discrepancies, all dates, unknown fields, and missing required info. Each response can be opened individually and reset (which returns that person to the public dropdown). A toggle disables the public link when collection is finished; the public page then shows a "collection closed" message.

### 3. Exports (admin only)
- **CSV** — one row per crew member, one column per identity / role / agreement / course-date / status field.
- **ChatGPT-ready text** — company/provider header block, one labeled section per crew member with recorded vs. confirmed quals, every date, online-provider selections, unknowns, and a consolidated "Missing Information" section at the end.

Both exclude Brandon Aldrich and Justin Richardson.

## Technical notes

- New table `ibpa_training_responses` (org-scoped, `crew_member_id` unique, JSONB payload + typed status columns). RLS: no anonymous select/insert at all; org admins can read, update (reset), and delete. Grants issued alongside the policies.
- New table row or org setting `ibpa_collection_open` flag for the kill switch.
- One public edge function `ibpa-training` with `verify_jwt = false` and three actions:
  - `roster` — returns only `{id, display name, recorded role/quals}` for eligible, not-yet-submitted, non-excluded members. Nothing else — no phones, emails, existing dates, or other responses.
  - `detail` — recorded role/quals for one selected member only.
  - `submit` — re-validates the member against the eligible list server-side, Zod-validates and sanitizes every field, then inserts with the service role. Duplicate submits return an "already submitted" response.
- Reading another person's response is impossible: the function has no read-response action.
- Rate limiting: the backend has no standard rate-limiting primitive, so this uses an ad-hoc per-IP counter inside the function (short window, in-table). It is best-effort, not a hardened limiter.
- Public route registered outside `ProtectedRoute` (same pattern as `/privacy`).
- Existing crew, red card, and training tables are read-only in this feature — no writes, no schema changes to them.

## Delivery

After the build: the public link, admin page location, export instructions, and confirmation of the two exclusions, cross-device dropdown removal, and that no existing records were touched.
