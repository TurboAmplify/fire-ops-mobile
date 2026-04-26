# QuickBooks Online Integration — Roadmap (v1.1+)

> **Audience:** future-me, future contributors, future-AI in a fresh chat.
> **Status as of creation:** Planning only. Nothing is built. Do not start
> until the iOS app has shipped and Apple has approved at least one production
> release.

---

## 1. Status & Timing

**Deferred until after Apple App Store approval of v1.0.**

Why: adding a QuickBooks Online (QBO) integration before approval pushes
FireOps HQ into Apple's stricter financial-services review path:

- **Guideline 1.6** (Data Security) — heightened scrutiny for apps touching
  accounting / financial systems
- **Guideline 5.1.5** (Location & Sensitive Data) — payroll + tax data is
  treated as sensitive
- Reviewer is more likely to ask for a financial-services entity disclosure
  or proof of a payroll/accounting partnership

Shipping v1.0 as a pure operations + estimation tool keeps us out of that
review track. QBO sync becomes a **v1.1 power feature** that converts
existing operational data into something genuinely time-saving for
contractors at tax/payroll time.

---

## 2. Difficulty Assessment

**Medium.** Roughly **2–3 weeks of focused build** for a single developer.

| Why it's not hard | Why it's not trivial |
|---|---|
| Data model is already clean (multi-tenant, RLS, normalized) | OAuth 2.0 + token refresh must be bulletproof |
| Paystub generation already produces line-item data | Idempotent sync (don't double-post journal entries) |
| Org isolation is solid; QBO connection is per-org | Account-mapping UI is fiddly to get right |
| One-way push is much simpler than two-way sync | Sandbox → production cutover requires care |
| No payment processing means no PCI scope | QBO API quirks around employees vs vendors for 1099s |

Not in scope for v1.1: two-way sync (QBO → app), invoicing, AP/AR pull,
real-money movement.

---

## 3. What's Already in Good Shape

The current data model maps cleanly onto QBO. Concretely:

- **Multi-tenant org isolation** with `org_id` on every business table and
  RLS enforced everywhere → QBO connection lives at the org level, no
  cross-tenant leakage risk.
- **Crew members** have stable IDs, names, and roles → straightforward to
  map to QBO `Employee` or `Vendor` (1099) entities.
- **Withholding profiles + org payroll settings** already capture rates,
  deductions, filing status → these become the source of truth that *feeds*
  QBO, not something QBO needs to send back.
- **Paystub generation** (`generatePaystubPdf.ts` + `lib/payroll.ts`) already
  produces line items: gross, OT, H&W, federal/state/FICA/Medicare
  withholdings, deductions, net. Each line maps to a QBO GL account.
- **Org-level admin role** already gates payroll → same role gates the QBO
  connection UI.
- **Edge function pattern** is established (auth + RLS + service-role inside
  the function) → QBO OAuth callback and sync workers slot right in.

Translation: we wouldn't be refactoring to add QBO. We'd be adding *on
top of* a clean foundation.

---

## 4. Recommended Build Sequence (Post-Approval)

Build in this order. Each step is independently valuable; don't skip ahead.

### (1) QBO sandbox app registration + OAuth scaffolding
- Register a QBO app in Intuit Developer portal (sandbox first)
- Store `QBO_CLIENT_ID` and `QBO_CLIENT_SECRET` as Lovable Cloud secrets
- Build edge functions:
  - `qbo-oauth-start` — generates auth URL with state
  - `qbo-oauth-callback` — exchanges code for tokens, stores per-org
  - `qbo-token-refresh` — runs on demand before any API call
- New table `qbo_connections` (one row per org): `org_id`, `realm_id`,
  `access_token` (encrypted), `refresh_token` (encrypted), `expires_at`,
  `connected_by_user_id`, `connected_at`, `last_synced_at`
- RLS: only org admins can read/write their org's row

### (2) Pay run snapshot model — **critical foundation, see §5**
This is the single most important architectural step. Build it even if QBO
sync gets cancelled.

### (3) Employee → QBO entity mapping table
- New table `qbo_crew_mapping`: `org_id`, `crew_member_id`,
  `qbo_entity_type` (`employee` | `vendor`), `qbo_entity_id`, `last_verified_at`
- UI: per-crew-member dropdown to either pick an existing QBO employee/vendor
  or create one
- Default: contractors → `Vendor` (1099), W-2s → `Employee`

### (4) Account mapping UI
- New table `qbo_account_mapping`: `org_id`, `payroll_line_type`
  (`gross_wages`, `overtime`, `hw`, `federal_withholding`, `state_withholding`,
  `fica`, `medicare`, `deduction`, etc.), `qbo_account_id`, `qbo_account_name`
- UI: one-time setup wizard — admin picks which QBO GL account each payroll
  line type posts to
- Validation: refuse to push pay runs until all required mappings are set

### (5) One-way push: pay run → QBO journal entry / bill
- For W-2 employees: post a Journal Entry per pay run
- For 1099 vendors: create a Bill per vendor per pay period
- Use the pay run snapshot ID (from step 2) as the QBO `PrivateNote` or
  custom field for **idempotency** — never post the same snapshot twice
- Edge function `qbo-push-pay-run` — accepts a `pay_run_id`, returns sync
  results

### (6) Sync status + retry + reconciliation view
- New table `qbo_sync_log`: `org_id`, `pay_run_id`, `status`
  (`pending` | `success` | `partial` | `failed`), `qbo_object_ids` (jsonb),
  `error_detail`, `attempted_at`, `attempted_by`
- UI: per–pay-run badge (Synced / Failed / Not synced) + retry button
- Admin dashboard: "QBO sync health" — last successful sync, any pay runs
  not yet pushed, any failures needing attention

---

## 5. Critical First Build — The Pay Run Snapshot Model

**Build this even if QBO never ships.** It's also valuable on its own as an
audit trail and immutable history.

### Why it matters
Today, paystubs are generated on-the-fly from current rates and current
withholding settings. If an admin changes a withholding rate next month and
re-opens last month's paystub, the numbers shift. That's fine for an
estimation tool — but it's incompatible with any external accounting system,
which expects pay runs to be **immutable point-in-time records**.

### What to build
A new table `pay_runs` (or `payroll_periods`, name TBD):

```
pay_runs
- id (uuid, pk)
- org_id (uuid, fk, RLS-scoped)
- period_start (date)
- period_end (date)
- pay_date (date)
- status (draft | finalized | synced | voided)
- finalized_at (timestamptz, nullable)
- finalized_by_user_id (uuid, nullable)
- snapshot (jsonb)   -- frozen copy of every line item for every crew member
- created_at, updated_at
```

The `snapshot` jsonb holds the **frozen** version of:
- Each crew member's hours, rates, gross, OT, H&W
- Each withholding line (rate AND dollar amount at time of finalization)
- Each deduction
- Net pay
- The withholding profile in effect at the moment of finalization

Once `status = finalized`, the snapshot is **never** mutated. Re-opening a
finalized paystub reads from the snapshot, not from current rates. To make
changes after finalization, you `void` and create a new pay run.

### Side benefits (independent of QBO)
- Real audit trail for the org (currently we don't have one for payroll)
- Year-end reports become trivial (sum across all finalized snapshots)
- Disputes ("my paycheck was wrong") become resolvable
- Apple/legal posture improves — we can honestly say payroll history is
  immutable, not recalculated

This is the one piece of infrastructure that's worth building **before**
QBO is on the roadmap. Schedule it for v1.0.x or v1.1 regardless of QBO
timing.

---

## 6. OAuth + Secrets Setup (Reference)

When step (1) starts, here's the checklist:

### Intuit developer portal
1. Create a developer account at developer.intuit.com
2. Create a new app — select "QuickBooks Online and Payments"
3. In **Keys & OAuth** settings, get sandbox `client_id` and `client_secret`
4. Set redirect URI to: `https://app.fireopshq.com/qbo/callback`
   (and the corresponding `id-preview` URL for testing)
5. Request scopes: `com.intuit.quickbooks.accounting` (payroll integration
   uses the standard accounting scope; Intuit's hosted Payroll API is a
   separate product we are *not* using)

### Lovable Cloud secrets to add
- `QBO_CLIENT_ID`
- `QBO_CLIENT_SECRET`
- `QBO_ENV` (`sandbox` or `production`)
- `QBO_TOKEN_ENCRYPTION_KEY` (32-byte key for encrypting stored refresh
  tokens at rest)

### Token refresh pattern
Before every API call from a sync worker:
1. Read `qbo_connections` row for the org
2. If `expires_at` is within 5 minutes of now → call `qbo-token-refresh`
3. Use the (possibly refreshed) `access_token` in the QBO API call
4. On any `401` response → mark connection as `needs_reauth`, surface in UI

### Sandbox → production cutover
- Build entire flow against sandbox first
- Have one real QBO account ready as the production canary
- Switch `QBO_ENV` to `production` and re-do OAuth (sandbox tokens are
  not interchangeable with production)
- Run one real pay run end-to-end on the canary account before announcing

---

## 7. What Stays Out of Scope

Explicitly **not** part of v1.1:

- ❌ Two-way sync (QBO → app). FireOps HQ is the source of truth for crew,
  hours, and rates. QBO is downstream.
- ❌ Payment processing of any kind (still no money movement in the app)
- ❌ Tax filing, e-file, IRS/state submissions
- ❌ Invoicing customers from inside the app
- ❌ Pulling AP/AR or bank balances from QBO
- ❌ Hosted Intuit Payroll API (different product, much more compliance
  surface area, we don't need it)

The mental model stays: **FireOps HQ = operations + estimation. QBO = the
real accounting system. We push, we don't pull.**

---

## 8. Decision Log

Fill in as choices get made.

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-04-26 | Defer QBO until post-Apple-approval | Avoid financial-services review path on v1.0 |
| _____ | | |
| _____ | | |
| _____ | | |

---

## 9. When You're Ready to Start

1. Re-read this doc end-to-end.
2. Start with **§5 (pay run snapshot model)** — it's the prerequisite.
3. Then **§4 step (1)** (OAuth scaffolding) and walk the sequence in order.
4. Use sandbox until step 6 is fully tested, then cut to production on a
   single canary org.
5. Update §8 Decision Log as you go so the rationale is preserved.
