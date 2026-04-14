# Project Memory

## Core
FireOps HQ: mobile-first ops tool for wildland fire contractors.
Cross-platform: iOS + Android via Capacitor. No platform-specific UI patterns.
Lovable Cloud backend (Supabase). No auth yet — open RLS policies.
Bottom tab nav, 5 tabs max. Touch targets ≥44px. No hover interactions.
Permissions requested only at point of use, never on launch.
Photos/attachments via platform-neutral input or Capacitor Camera plugin.
Multi-tenant foundation in place (Step 1 done). org_id columns nullable, RLS still permissive.

## Memories
- [Database schema](mem://features/db-schema) — 8 tables, incident_trucks as central hub, revised schema pending migration
- [Multi-tenant schema](mem://features/multi-tenant-schema) — organizations, members, invites, profiles tables, org_id columns, helper functions
- [Mobile store readiness](mem://features/mobile-store) — iOS + Android packaging checklist, Capacitor config
- [Cross-platform UI rules](mem://design/cross-platform-ui) — Safe areas, back buttons, no swipe-only nav, platform-neutral icons
- [Offline tolerance](mem://features/offline-tolerance) — IndexedDB query cache, offline mutation queue, connectivity banner, App Store compliant
