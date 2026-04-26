## Add QuickBooks Integration Roadmap Doc

Create a single new markdown file in `docs/` capturing the QuickBooks Online (QBO) integration roadmap so it survives chat history and is ready to reference when you start v1.1 work after Apple approval.

### File to create

**`docs/quickbooks-integration-roadmap.md`** — sectioned as:

1. **Status & timing** — Deferred until after Apple approval. Reason: pre-approval QBO integration would push the app into Apple's stricter financial-services review (Guideline 1.6 + 5.1.5).

2. **Difficulty assessment** — Medium. Roughly 2-3 weeks of focused build. Not hard because your data model is already clean; not trivial because OAuth + token refresh + idempotent sync need care.

3. **What's already in good shape** — Multi-tenant org isolation, RLS on every payroll table, crew/rates/withholdings already structured, paystub generation already produces line-item data that maps cleanly to QBO journal entries.

4. **Recommended build sequence (post-approval)** — the 6-step order:
   - (1) QBO sandbox app registration + OAuth scaffolding
   - (2) **Pay run snapshot model** (critical foundation — immutable record of each pay period)
   - (3) Employee → QBO Vendor/Employee mapping table
   - (4) Account mapping UI (which QBO GL accounts receive which payroll line items)
   - (5) One-way push: pay run → QBO journal entry / bill
   - (6) Sync status + retry + reconciliation view

5. **Critical first build** — The pay run snapshot table. Called out separately because it must land before any QBO work, and it's also valuable on its own (audit trail, immutable history) even if QBO never ships.

6. **OAuth + secrets** — Where QBO client ID/secret will live (Lovable Cloud secrets), token refresh edge function pattern, sandbox → production cutover steps.

7. **What stays out of scope** — No two-way sync (QBO → app), no payment processing, no tax filing. App remains an estimation/operational tool that *exports to* a real accounting system.

8. **Decision log** — empty section with date stubs, for you to fill in as choices get made later.

### Also update

**`docs/build-priority.md`** — add a short "Post-approval / v1.1 candidates" section at the bottom listing QuickBooks integration with a one-line pointer to the roadmap doc, so it's discoverable from the main priority doc.

### Privacy confirmation (no code change needed)

The `docs/` folder is source-only, never bundled into the app, never served as a route, never uploaded anywhere. It's visible only inside your Lovable project. Confirmed — these notes stay private to you.

### Files touched
- `docs/quickbooks-integration-roadmap.md` (new)
- `docs/build-priority.md` (append a short v1.1 section)

No code changes, no schema changes, no UI changes. Pure documentation.
