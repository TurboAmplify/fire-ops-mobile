## Wrap Project A and hand off to the marketing project

Project A (app lockdown + provisioning webhook) is already shipped. Two small things left before you switch projects.

### 1. Add the shared HMAC secret to this app

I'll prompt you for a secret named `MARKETING_SITE_HMAC_SECRET`. You paste in any 32+ char random string (e.g. `openssl rand -hex 32`, or a 64-char password from a password manager).

**Save that exact string somewhere safe** — the marketing project needs the identical value, or signed calls will fail.

### 2. You manually switch to the marketing project

Open: [FireOps HQ Marketing](/projects/abeaf81a-daee-4065-8ed1-085b9efbbb97)

Paste this prompt into its chat to start Project B:

> Build the FireOps HQ signup, billing, and account portal. The companion iOS app project (`63e454bc-32e1-42ee-9def-17eb4240739a`, Supabase URL `https://ipfuaywcilpcmguhbjmj.supabase.co`) already has an HMAC-signed `marketing-webhook` edge function with actions: `provision-org`, `update-org-billing`, `suspend-org`, `reactivate-org`, `close-org`. Add `MARKETING_SITE_HMAC_SECRET` to this project's secrets — I'll paste the same value used in the app.
>
> Build:
> 1. `/signup` flow — pick plan, collect email + full_name + org_name + org_type (contractor/vfd/state_agency) + operation_type (engine/hand_crew/both), Stripe Checkout via Lovable's built-in Stripe payments. On `checkout.session.completed`, call app's `marketing-webhook` with `{action:'provision-org', ...}`. Success page: "Check your email to set your password."
> 2. `/account` portal — separate Supabase auth here for owners. Show plan/billing status, Stripe Customer Portal link, Cancel button → `close-org`.
> 3. Stripe webhooks → `customer.subscription.deleted` → `close-org`, `invoice.payment_failed` final → `suspend-org`, `invoice.payment_succeeded` after suspension → `reactivate-org`, `customer.subscription.updated` → `update-org-billing`.
> 4. HMAC: every call to `marketing-webhook` must include header `x-fireops-signature: t=<unix_ts>,v1=<hmac_sha256(timestamp + "." + raw_body, MARKETING_SITE_HMAC_SECRET)>`. 5-min replay window.
> 5. Update homepage — remove "Coming Soon", real CTA to `/signup`.
>
> Reference plan codes in app's `src/lib/billing/{contractor,vfd,agency}-plans.ts` via cross-project tools.

### Why you have to switch manually

Each Lovable project is its own codebase + chat. I can read across with cross-project tools, but I can't write into another project's files. The marketing project's agent will handle Project B in its own thread.

Approve this plan and I'll trigger the secret form.