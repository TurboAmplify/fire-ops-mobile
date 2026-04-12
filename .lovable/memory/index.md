# Project Memory

## Core
FireOps HQ: mobile-first ops tool for wildland fire contractors.
Cross-platform: iOS + Android via Capacitor. No platform-specific UI patterns.
Lovable Cloud backend (Supabase). No auth yet — open RLS policies.
Bottom tab nav: Home, Incidents, Payroll, Expenses, More. Touch targets >=44px.
Fleet, Crew, Needs List, Settings accessible via "More" tab.
Permissions requested only at point of use, never on launch.
Multi-tenant foundation in place. org_id columns nullable, RLS still permissive.

## Memories
- [Database schema](mem://features/db-schema) — 8 tables, incident_trucks as central hub, revised schema pending migration
- [Multi-tenant schema](mem://features/multi-tenant-schema) — organizations, members, invites, profiles tables, org_id columns, helper functions
- [Mobile store readiness](mem://features/mobile-store) — iOS + Android packaging checklist, Capacitor config
- [Cross-platform UI rules](mem://design/cross-platform-ui) — Safe areas, back buttons, no swipe-only nav, platform-neutral icons
- [OF-297 Shift Tickets](mem://features/of297-shift-tickets) — Emergency Equipment Shift Ticket form with signatures
- [Payroll module](mem://features/payroll) — Weekly payroll with per-employee rates, H&W, OT calc, Mon-Sun weeks
