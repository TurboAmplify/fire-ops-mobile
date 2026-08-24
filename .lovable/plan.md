# Performance Evals (ICS-225 / OF-225)

Add an Evals section that handles the federal **Incident Personnel Performance Rating** form three ways, all mobile-first, with signatures like shift tickets.

## The three flows

1. **Internal eval (you rate your own crew)** — a supervisor picks the incident + crew member from the roster, fills the eval in the app, signs as rater, then hands the phone to the employee to sign the acknowledgement (block 11) in the same session.
2. **Outward eval (you rate someone outside the org)** — rater fills it out in the app for a free-text name/home unit, signs, then sends a link to the person evaluated so they can read it and sign the acknowledgement.
3. **Inbound eval request (an outside supervisor rates your crew member)** — you pick the incident + crew member, generate a link, and text it. The recipient opens a no-login page with the fire name/number, dates, location, and crew member already filled in. They complete the ratings, remarks, their name/home unit/position, and sign as rater. Your crew member signs the acknowledgement afterward (in-app, or in-session if they're together).

## Easy-read vs Traditional toggle

Every eval page (public link and in-app) has a toggle at the top:

- **Easy read (default)** — one rating factor per row, large 0/1/2/3 tap targets, plain-English help text for each score, column selector (Hot Line / Mop-Up / Camp / Other) chosen once at the top instead of a 16-cell grid.
- **Traditional** — a faithful render of the actual ICS-225 form (same blocks, same numbering, same rating grid) so the person can confirm they're filling out the real form. Values entered in either view are the same data; switching views never loses input.

## Sending the link — native share

Yes, native works. The app already ships `@capacitor/share`, so tapping **Send eval link** opens the real iOS/Android share sheet: the user taps Messages, picks the contact, and the pre-written text + link is already in the message. No copy-paste, no app switching. Fallbacks, in order:

1. Native share sheet (packaged iOS/Android app).
2. Web Share API (mobile Safari/Chrome).
3. `sms:` link with the body pre-filled.
4. Copy link button (desktop / anything else).

## PDF output

Each completed eval exports as a filled ICS-225 PDF matching the federal layout, with both signatures drawn in — same generator approach and share/download path already used for OF-297 shift tickets, so it works on iOS.

## Where it lives

- **More → Evals** — list of evals with status pills: Draft, Awaiting rater, Awaiting employee signature, Complete. Filters by incident and crew member.
- **Crew member detail** — their evals listed, with "New eval" and "Request eval" buttons.
- **Incident detail** — evals for that fire, so requests can go out before demob.

Loading, empty, and error states on every screen; the form saves as a draft while typing so a dropped signal doesn't lose work.

## Technical notes

- New table `personnel_evals`: org, incident, crew_member (nullable for outward evals), subject/rater identity fields, blocks 1–8 header fields, `ratings` JSONB (factor × column × score, plus "other" labels), remarks, two signature URLs + names/titles/dates, `direction` (`internal` | `outward` | `inbound_request`), `status`, and a `public_token`. RLS scoped to org membership with GRANTs; no anon access to the table.
- Public link served by a new edge function `eval-form` (`verify_jwt = false`), same hardened pattern as `ibpa-training`: token lookup, input sanitising, rate limiting, service-role writes. The token only exposes that one eval.
- Public page rendered through the existing lightweight `PublicFormApp` shell (path `/eval/:token`) so it loads fast on field connections — no auth or org context bootstrapping.
- Signatures reuse `SignatureCanvas` + the `signatures` storage bucket, including offline local-sig fallback for in-app signing.
- Files: `src/pages/Evals.tsx`, `src/pages/EvalEdit.tsx`, `src/pages/PublicEvalForm.tsx`, `src/components/evals/*` (EasyReadRatings, TraditionalForm, SendEvalLinkButton), `src/services/evals.ts`, `src/hooks/useEvals.ts`, `src/lib/pdf-eval-225.ts`, `src/lib/native-share-link.ts`.

## Build order

1. Migration + service/hook layer.
2. In-app eval form with both views and dual signatures (flow 1).
3. PDF export.
4. Public token page + edge function, link generation and native share (flows 2 and 3).
5. Evals list, crew/incident entry points, statuses.
