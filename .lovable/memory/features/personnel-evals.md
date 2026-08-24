---
name: Personnel Evals (ICS-225)
description: Incident Personnel Performance Rating feature — internal + public texted-link evals, easy-read/traditional toggle, signatures, PDF export
type: feature
---
- Table: `personnel_evals` (org-scoped, `crew_member_id`, `public_token`, `direction` internal|external, status draft/sent/signed)
- Two flows:
  1. Internal: admin/engine boss fills it in-app at `/evals/:evalId`, both parties sign on device.
  2. Public link: `/eval/:token` — no login, served through the `eval-form` edge function (verify_jwt=false). Sent via native share sheet / `sms:` link from `SendEvalLinkSheet`.
- Toggle at top of both editor and public form: **Easy read** (mobile-friendly cards, 0-3 rating chips with plain-language help) vs **Traditional form** (real ICS-225 grid so the signer sees the actual federal form).
- Rating factors and score labels live in `src/lib/eval-225.ts` (single source of truth for UI + PDF).
- Signatures reuse the shift-ticket canvas pattern; stored in the `signatures` bucket.
- PDF: `src/lib/pdf-eval-225.ts` (pdf-lib), one landscape-free letter page matching the federal layout; work-category columns are Hot Line / Mop-Up / Camp / Other(custom label).
- Pages: `src/pages/Evals.tsx`, `EvalEdit.tsx`, `PublicEvalForm.tsx`. Components in `src/components/evals/`.
- Entry point: More tab → "Performance Evals (ICS-225)" (admins + engine bosses).
