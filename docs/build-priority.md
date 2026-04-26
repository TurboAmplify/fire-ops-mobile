# Build Priority — FireOps HQ

## Phase 1 (Critical)

- Incident Management
- Timekeeping
- Expenses

## Phase 2

- Crew Management
- Fleet Management

## Phase 3

- Dashboard improvements
- Needs list
- Enhancements

## Phase 4 (Store Release)

- App Store & Play Store packaging via Capacitor
- Privacy policy and support pages
- App icons and splash screens (both platforms)
- Final QA on physical iOS and Android devices
- Store listing assets (screenshots, descriptions)

---

## Rules

- Do not build everything at once
- Ship working features early
- Validate with real users before expanding
- Prioritize real-world usage over completeness
- Test on both iOS and Android before any store submission
- Keep all UI patterns platform-neutral

---

## Post-Approval / v1.1 Candidates

Features intentionally deferred until after Apple has approved v1.0. Do
**not** start any of these before the first production App Store release.

- **QuickBooks Online integration** — one-way sync of finalized pay runs
  to QBO as journal entries (W-2) or bills (1099). See
  [`docs/quickbooks-integration-roadmap.md`](./quickbooks-integration-roadmap.md)
  for the full plan, build sequence, and OAuth setup.
- **Pay run snapshot model** — immutable point-in-time record of each pay
  period. Prerequisite for QBO sync, but valuable on its own as an audit
  trail. Can ship in a v1.0.x patch release independent of QBO.
