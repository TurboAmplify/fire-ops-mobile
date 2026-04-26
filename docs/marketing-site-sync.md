# Marketing Site Sync — Legal Copy Blocks

The marketing site at **fireopshq.com** must mirror the app's legal language.
Apple reviewers compare the in-app Terms/Privacy with the public Privacy URL
(`https://fireopshq.com/privacy`). Mismatched language is a common rejection
trigger under Guideline 5.1.1.

When working in the marketing site project, type `@FireOps HQ` in chat and
ask it to copy these sections **verbatim** from the canonical sources below.

---

## Canonical sources (in this app project)

| Section | Source file | Notes |
|---|---|---|
| Privacy Policy (full) | `src/pages/Privacy.tsx` | Includes payroll data disclosure |
| Terms of Use (full) | `src/pages/Terms.tsx` | Includes Payroll & Tax Estimation section |
| Support / Contact | `src/pages/Support.tsx` | Email: `support@fireopshq.com` |

---

## Required URLs on the marketing site

These URLs **must load without sign-in** and return HTTP 200:

- `https://fireopshq.com/privacy`
- `https://fireopshq.com/terms`
- `https://fireopshq.com/support`

The homepage **must not** say "Coming Soon" — change to "Now available on iOS"
or similar once the App Store listing is live, or App Store Connect will flag
it under Guideline 2.3.10 (Accurate Metadata).

---

## Critical: Payroll & Tax disclaimer parity

The marketing site Terms page **must** include the **"Payroll & Tax
Estimation"** section copied from `src/pages/Terms.tsx`. This section
establishes:

1. The payroll module is an estimation tool only
2. It is not a licensed payroll service and not tax advice
3. Withholdings are simplified flat rates, not IRS tax tables
4. Paystubs do not replace W-2s, 1099s, or Form 941
5. The user remains responsible for filing taxes
6. FireOps HQ is not liable for filing errors or penalties

The marketing site Privacy page **must** include the **payroll data**
bullet copied from `src/pages/Privacy.tsx` covering hourly rates, H&W rates,
filing status, dependents, withholding percentages, deductions.

---

## Recommended workflow

1. In the **marketing site** Lovable project, open chat
2. Type `@FireOps HQ` to reference this app project
3. Send this prompt:

> Copy the full content of `src/pages/Privacy.tsx` and `src/pages/Terms.tsx`
> from FireOps HQ into the marketing site at `/privacy` and `/terms`
> respectively. Preserve all section headings and the Payroll & Tax
> Estimation language verbatim. Use the marketing site's existing layout
> components instead of `<AppShell>`. Also create a `/support` page with
> `support@fireopshq.com` as the contact email and a short FAQ.

4. After the marketing site updates, verify all four URLs:
   - `/privacy`, `/terms`, `/support` load with the updated payroll language
   - Homepage no longer says "Coming Soon"

---

## When to re-sync

Update the marketing site any time you change:
- `src/pages/Privacy.tsx` (especially the data-collection list)
- `src/pages/Terms.tsx` (especially the Payroll & Tax Estimation section)
- `src/pages/Support.tsx`
- `docs/app-privacy-questionnaire.md` (data-collection answers)

Drift between in-app and marketing-site language is the single most common
post-launch compliance issue — keep them locked together.
