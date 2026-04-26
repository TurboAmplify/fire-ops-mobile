# FireOps HQ — Comprehensive Feature Overview

A production-grade, mobile-first operations app for wildland firefighting contractors. Built as a cross-platform web/iOS/Android app (React + Capacitor) with a Lovable Cloud backend (Postgres + RLS, Storage, Edge Functions, AI Gateway).

---

## 1. Platform & Architecture

- Mobile-first responsive web app, packaged for iOS App Store and Google Play via Capacitor
- React + TypeScript + Vite, Tailwind CSS, shadcn/ui, Lucide icons
- Backend: Lovable Cloud (Postgres with Row-Level Security, Storage buckets, Edge Functions, AI Gateway)
- React Query with IndexedDB persistence for offline tolerance
- Bottom tab navigation (5 tabs max), platform-neutral UI, ≥44px touch targets, no hover-only interactions
- Safe-area aware layouts, keyboard-aware forms

---

## 2. Authentication & Multi-Tenancy

- Email/password login, password reset flow
- Google OAuth (where enabled)
- Multi-organization model: users belong to one or more orgs and can switch active org
- Org setup flow for new accounts; org settings page
- Roles: `admin`, `crew`, plus platform-level `super-admin`
- User invites with seat limits per org and tier-based feature gating
- Role-based route gates (`ProtectedRoute`, `AdminGate`, `ModuleGate`, `PlatformAdminGate`)
- Account deletion via secure edge function

---

## 3. Offline Tolerance

- Query cache persisted to IndexedDB (24h, App Store-compliant)
- Offline mutation queue replays writes on reconnect (72-hour expiry)
- Connectivity banner: amber "Offline" / green "Back online"
- `networkMode: offlineFirst` for all queries
- Designed for poor signal at fire camps

---

## 4. Dashboard

- Active incidents summary
- Quick stats (hours, expenses, crew on assignment)
- Alerts for missing data and expiring items (inspections, certs)
- Quick-access shift ticket entry

---

## 5. Incident Management

- Create/edit incidents (name, type, location, dates, acres, containment, status)
- **Incident from Agreement**: AI parses uploaded EERA/agreement PDF into incident fields
- Assign trucks to incidents (`incident_trucks` join)
- Assign crew per truck per incident (`incident_truck_crew` with active/released lifecycle)
- Daily crew grid view per incident
- Resource Order section: AI parses resource order PDFs to auto-populate truck info
- Incident summary statistics (totals, hours, expenses)
- Incident lifecycle: assigned → active → demobed → completed

---

## 6. Shift Tickets (OF-297)

Federal Emergency Equipment Shift Ticket workflow, fully digital.

- Auto-populated header from resource order + truck data
- Equipment entries (date, start/stop times, qty, type, remarks) as JSONB
- Personnel entries (per-crew op times, standby times, totals, structured remarks)
- Personnel remarks: activity type (Travel/Work + context), Lodging, Per Diem
- **CrewSyncCard**: one-tap apply equipment times to all crew, auto-suggest 30-min lunch on 8h+ shifts
- Lunch deduction logic with split-aware enforcement (no double subtraction)
- Individual per-crew editing via collapsible rows
- Pay adjustments section (bonuses, deductions per ticket)
- Military time inputs
- **Signature capture** via full-screen canvas (driver + agency), stored in `signatures` bucket
- **PDF export** matching official OF-297 layout (jsPDF)
- **Audit trail PDF** showing all edits to a ticket
- Draft save, duplicate ticket (+1 day, clears signatures)
- AI-powered import: parse a photo/PDF of a hand-written shift ticket into structured entries
- Recent shift tickets feed (sorted by actual shift date, deduped to latest per truck)

---

## 7. Crew Management

- Crew roster with roles (crew boss, sawyer, EMT, etc.)
- Photo upload per crew member
- Contact info, active/inactive status
- Per-org crew access management (which crew a user can see)
- Quick assignment to trucks/incidents

---

## 8. Fleet Management

- Truck inventory (name, unit type, status, notes)
- Truck detail page with sections:
  - Hero photo + photo gallery
  - Info (VIN, plates, make/model, etc.)
  - Access (who can edit/view)
  - Documents (registration, insurance, certs)
  - Inventory checklist
  - Service log
  - **Inspections**: configurable templates, runner UI, due banner for upcoming/overdue
- **AI truck photo parsing**: extract truck details from a photo
- Daily rate per truck ($4k/day default for fire deployments) for P&L revenue calculation

---

## 9. Expenses

- Add expense (category: fuel, ppe, food, lodging, equipment, other)
- Receipt upload (camera or file picker, platform-neutral)
- **AI receipt parsing**: single-receipt and **batch receipt scan** (process many at once)
- Fuel-type modal for fuel expenses
- Meal compliance fields (per diem rules)
- Attach to incident and optionally specific truck
- Expense review queue for admins
- Status badges (pending, approved, etc.)
- Filter by category, incident, date

---

## 10. Payroll (Admin-gated, super-admin enabled)

- Per-employee compensation: base hourly rate, H&W rate
- Defaults: $28.73/hr base, $4.93/hr H&W
- Formula: reg hrs (≤40/wk) × (base + H&W) + OT × base × 1.5
- Monday week start; H&W only on first 40 hrs (never on OT)
- Withholdings (simplified %): federal, SS (6.2%), Medicare (1.45%), state, extra
- Per-employee overrides (filing status, dependents, exemptions, other deductions)
- **Workers Comp**: 16% of gross pay (org-configurable)
- Org payroll settings card (rates, percentages, factoring %)
- Live-derived pay from shift ticket personnel entries
- Views: This Week / Pay Period / All Time, grouped By Crew or By Fire
- **Paystub** on-screen modal + PDF export
- Payroll adjustments (bonuses, deductions per pay period)
- Withholding profile form per employee
- "Estimated Withholding — Not Official Tax Calculation" compliance banner
- Global kill-switch + per-org module toggle
- Hidden from crew users and from non-payroll orgs

---

## 11. Admin Reports

- **P&L Report**: revenue (truck daily rates × deployed days), labor costs (gross + employer match + workers comp), expenses, factoring fees (3% or 4.5%, default 4.5%, toggleable), net profit
- **Payroll Report**: aggregated payroll by period
- **Incident Report**: per-incident summary
- **Activity Report**: user/system activity
- **Audit Report**: change history
- Date range picker, scope picker (org/incident/crew)
- Export: CSV, Excel (xlsx), PDF (table layout), shareable link
- Paystub bundle PDF (multiple employees in one file)

---

## 12. Needs List

- Per-incident running list of supplies/resources needed
- Quick add form, status tracking

---

## 13. Training

- Module-gated training section (certifications, course tracking)

---

## 14. Super Admin (Platform)

- Organizations list and detail (manage tiers, seats, modules)
- Users list across all orgs
- Activity feed across the platform
- Audit log
- Payroll access toggle per org
- **Impersonation**: platform admin can act as any org admin (with banner indicator)

---

## 15. Settings

- Per-user settings (theme, app background)
- Organization settings (name, tier, defaults, payroll settings)
- Crew access manager
- Nav bar customizer (reorder/hide bottom tabs)
- Privacy policy, Terms of Service, Support pages

---

## 16. Tutorial / Onboarding

- In-app tutorial overlay with step-by-step guidance
- Tutorial mini-bar for resuming
- Setup checklist step-tracking

---

## 17. AI Features (via Lovable AI Gateway, no user API key required)

Edge Functions powered by Gemini/GPT models:

- `parse-agreement` — extract incident from EERA PDF
- `parse-resource-order` — extract truck/crew from resource order
- `parse-shift-ticket` — OCR a hand-written OF-297 into structured entries
- `parse-receipt` — single receipt to expense
- `parse-batch-receipts` — multiple receipts in one pass
- `parse-truck-photo` — extract truck details from photo
- `delete-account` — secure account deletion

---

## 18. Storage & Files

- Buckets: signatures, receipts, truck photos, crew photos, agreements, resource orders
- Signed URL generation for secure access
- `SignedImage` and `SignedLink` components for time-bound access

---

## 19. Mobile / Cross-Platform

- Capacitor wrapper for iOS and Android
- Despia configuration for store packaging
- Permissions requested only at point of use (camera, etc.)
- Platform-neutral icons and patterns
- iOS permission strings configured
- App Store and Play Store readiness checklists

---

## 20. Data Model (Core Tables)

`organizations`, `organization_members`, `organization_invites`, `profiles`, `incidents`, `trucks`, `incident_trucks`, `crew_members`, `incident_truck_crew`, `shifts`, `shift_crew`, `shift_tickets`, `expenses`, `crew_compensation`, `org_payroll_settings`, `payroll_adjustments`, `inspections`, `inspection_templates`, `resource_orders`, `agreements`, `needs_list`, `training`, `platform_settings`, plus audit tables.
