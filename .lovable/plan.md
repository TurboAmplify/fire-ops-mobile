

The user is clear: don't lock things down yet, don't add features, just make sure what exists works end-to-end. So this is a stabilization / QA pass, not a security pass and not a build pass.

The right deliverable is a structured QA + bug-fix plan organized by module, with a triage-first approach: walk every existing flow, log what breaks, fix the breaks, verify. No new features, no security refactors that could destabilize anything (bucket privatization is explicitly off the table for now).

I'll keep this concise — just the modules, what "fully developed and working" means for each, and the cadence.

---

# 2-Week Stabilization Plan — Get every existing feature production-ready

Goal: every module that's already in the app works end-to-end with no dead ends, no broken states, no silent failures. No new features. No destabilizing refactors. Security hardening is paused per your call.

## Approach

For each module: **walk it → log issues → fix → verify.** I'll work one module per session so you can test before moving on. Every fix is small and scoped — no rewrites.

For each flow I check: loading state, empty state, error state, offline behavior, the "happy path" on mobile viewport, role gating (admin vs crew), and that data actually persists across refresh.

## Module checklist (priority order — most-used first)

### 1. Incidents + Incident Trucks (Day 1-2)
- Create incident, assign trucks, assign crew to truck, edit, delete.
- Verify: agreement upload + parse, resource order upload + parse, crew add/remove, status changes, navigation back/forward without losing data.
- Watch for: orphaned incident_trucks, missing org_id on inserts, broken back-button flows.

### 2. Shift Tickets / OF-297 (Day 2-3)
- Create from incident truck, auto-populate from RO + agreement + truck + crew, equipment + personnel entries, CrewSyncCard, signatures, draft save, PDF export, duplicate.
- Watch for: signature upload failures, PDF rendering issues, crew not auto-filling, lost form state on navigation.

### 3. Crew (Day 3)
- Add/edit/delete crew member, photo upload, qualifications field (now exists for VFD/state), truck-access grants, hourly + H&W rates.
- Watch for: photo upload failures on mobile, role dropdown bugs, broken truck-access toggles.

### 4. Fleet (Day 4)
- Add/edit/delete truck, hero photo, all sections (info, access, checklist, documents, photos, inventory, service log, inspection).
- Walk-around inspection: template editor, run inspection, results saved.
- Watch for: photo bucket failures, inspection template item ordering, due-date banners.

### 5. Expenses (Day 5)
- Manual entry, receipt scan (single + batch), fuel-type modal, meal compliance fields, status transitions (draft → submitted → approved/rejected), incident attach.
- Watch for: AI parse failures, receipt URL persistence, status badge accuracy, missing org_id.

### 6. Org Setup + Settings (Day 6)
- New-user signup → org-type picker → land on Dashboard with correct nav.
- Org Settings: name, default H&W rate, walkaround toggle, inspection alerts.
- **Missing piece to finish:** per-module toggles + "Accepts assignment work" switch in OrgSettings — already approved in earlier plan, never wired up.
- Crew access manager, nav bar customizer (auto-save fix verified).

### 7. Module-gated pages (Day 7)
- Training (CRUD already shipped — verify it actually works).
- Run Report stub — confirm it loads without errors for VFD orgs.
- CTR stub — confirm it loads without errors for state agency orgs.
- Payroll — admin-only, confirm crew can't reach it.

### 8. Auth + onboarding edges (Day 8)
- Sign up, sign in, password reset, sign out.
- Invite flow (accept, decline, expired).
- Account deletion (the role-aware version we just shipped).
- Watch for: stuck loading states on auth changes, redirect loops.

### 9. Dashboard, Needs List, More page, BottomNav, Admin Logs (Day 9)
- Counts + quick actions on Dashboard.
- Needs list CRUD + purchased toggle.
- BottomNav favorites persist across refresh (already fixed — re-verify).
- More page shows all non-favorite items, role-filtered.

### 10. Cross-cutting checks (Day 10)
- Offline tolerance: airplane-mode every flow that uses `offline-mutations.ts`, confirm queue + replay.
- Mobile viewport (375x812) on every screen — no horizontal scroll, no clipped buttons, all touch targets ≥44px.
- Console: zero errors during normal use.
- Network: no failed requests on the happy paths.

## Process per module

1. I read the code for that module + walk the flow in the preview.
2. I list the bugs/gaps I find as a numbered list.
3. You confirm priorities (or just say "fix all").
4. I fix in small, isolated commits.
5. You verify on the preview before we move on.

## What I will NOT do

- Add new features.
- Privatize storage buckets (deferred per your call — flagged as a launch-blocker to revisit).
- Refactor working code "for cleanliness."
- Touch the auth flow structure.
- Rebuild any module.

## Deliverable at the end

A green checklist of all 10 sections + a short "known issues / deferred" doc covering: storage buckets still public, realtime on resource_orders, any minor polish items you decide to ship-with.

## Where to start

Say "go" and I'll start with Module 1 (Incidents + Incident Trucks) — the most critical and most-used flow. I'll walk it, log everything I find, then we triage together.

