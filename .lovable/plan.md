

# Tutorial / onboarding tour

## What you'll get

A **mobile-first guided tour** that runs automatically the first time a user logs in, and is always available from Settings → "Replay Tutorial" and a small "?" button on the Dashboard header.

The tour is a series of full-screen-friendly **bottom-sheet cards** (not a tooltip overlay — those break on mobile and require horizontal positioning). Each step shows:
- A title + short description (1-2 sentences)
- A small icon/illustration matching the feature
- "Skip", "Back", "Next" buttons + a progress dots indicator
- Optional "Take me there" button that navigates to the relevant screen

Steps cover the core flow:
1. **Welcome** — "FireOps HQ helps you run incidents, crews, and expenses from the field."
2. **Dashboard** — Active incidents, stats, quick actions
3. **Incidents** — Create incidents, assign trucks/crew
4. **Shift Tickets** — Daily OF-297 tickets per truck
5. **Crew** — Manage personnel, contacts, roles
6. **Fleet** — Trucks, photos, inspections, AI VIN scan
7. **Expenses** — Receipts, scan with AI, categorize
8. **Needs List** — Track what crews need on the fire
9. **Offline** — App works without signal, syncs when back
10. **Settings & Replay** — Where to find help and replay the tour anytime

Each step is a single card; no horizontal scroll, no tooltip pointing at off-screen elements, safe-area aware.

## How "first login" detection works

- `tutorial_completed_at` boolean stored in `profiles` table (per-user, syncs across devices).
- Plus a `localStorage` fallback so the tour can be dismissed instantly without a network round-trip.
- On Dashboard mount: if user is signed in, has an org, and `tutorial_completed_at` is null → auto-open the tour after a 600ms delay (lets the page settle).
- Marking complete: writes both `localStorage` and the profile column.

## How "available anytime" works

- Settings page → new "Replay Tutorial" row under a new **Help** section (above Legal & Support).
- Dashboard header → new small `?` icon button (next to the Super Admin chip) that opens the tour from step 1.
- Both call the same `useTutorial().start()` function.

## Mobile-first guarantees

- Card uses existing `Sheet` component (`side="bottom"`), already used elsewhere — proven safe-area + keyboard behavior.
- Content is `max-w-full px-4`, all text wraps, no fixed widths.
- Buttons are full-width stacked on narrow screens, no horizontal scroll possible.
- No element pointers / no tooltip-attached-to-DOM-node logic (those are fragile on mobile and cause horizontal overflow when the target scrolls off-screen).

## Backend (1 small migration)

- Add `tutorial_completed_at timestamptz` column to `profiles` (nullable, default null).
- No RLS changes needed — existing profile policies cover it (user can read/update own row).

## Files

- New migration: add `profiles.tutorial_completed_at`
- New: `src/hooks/useTutorial.tsx` — Provider + hook (state, open/close, mark complete, persist)
- New: `src/components/tutorial/TutorialOverlay.tsx` — The Sheet-based step UI
- New: `src/components/tutorial/tutorial-steps.ts` — The step content array (icon, title, body, optional route)
- Edited: `src/App.tsx` — Wrap routes with `TutorialProvider`, mount `<TutorialOverlay />` once
- Edited: `src/pages/Dashboard.tsx` — Auto-trigger on first visit + add `?` help button to header
- Edited: `src/pages/Settings.tsx` — Add "Help" section with "Replay Tutorial" row

## Out of scope (ask if you want these)

- Per-feature contextual tooltips (e.g. coach mark on the "Scan Receipt" button the first time a user lands on Expenses) — possible later as a separate "tips" layer.
- Video walkthrough — text + icons only for v1, keeps file size down.
- Role-specific tour variations (admin vs crew member) — single tour for everyone in v1.

