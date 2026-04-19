

The current tutorial is functional but basic — 10 generic info cards in a bottom sheet. Let me make it actually useful.

## What's weak today

- All 10 steps look identical (icon + title + paragraph). Boring, easy to skip.
- "Take me there" navigates away and **kills the tutorial** — user loses their place.
- No sense of progress beyond dots. No "you're almost done."
- Auto-starts on Dashboard only — if a new user lands elsewhere first (deep link from invite email, etc.) they never see it.
- No segmentation — a crew member sees the same admin-flavored tour as the org owner.
- No "what to do next" — tour ends with "Got it" and dumps you back where you were.

## What I'll improve

### 1. Richer step content
- Add a **"What you can do here"** bullet list to each feature step (3 short bullets instead of one paragraph). Scannable, not a wall of text.
- Add a **"Pro tip"** callout on key steps (e.g. Fleet: "Snap the VIN plate — AI fills in make/model/year").
- Replace generic icon tile with a **larger feature illustration area** using the icon + a soft gradient background matching the feature's color.

### 2. "Take me there" without losing the tutorial
- Instead of `navigate()` closing the sheet, navigate **and keep the tutorial minimized** as a small floating "Resume tour (4/10)" pill at the bottom of the screen.
- Tap the pill → reopens the sheet on the next step.
- This lets users actually *see* the screen being described while the tour is active.

### 3. Smarter first-run flow
- Auto-start works from **any** route (not just Dashboard) — move the `maybeAutoStart()` call into `TutorialProvider` itself so it fires once per session regardless of landing page.
- Add a **"Welcome, [name]"** personalization to step 1 using the user's profile.
- Add a final **"Setup checklist"** step replacing the generic "Replay anytime" card:
  - [ ] Add your first crew member → links to /crew
  - [ ] Add your first truck → links to /fleet
  - [ ] Create your first incident → links to /incidents/new
  - Each row checks itself off if data already exists (queries existing hooks).

### 4. Role-aware step ordering
- If user is org `admin` or `owner`: full 10-step tour.
- If user is `member`: skip "Org Settings" mention, lead with Shift Tickets + Crew + Expenses (what they actually do daily).
- Pull role from existing `useOrganization().membership.role`.

### 5. Better progress + polish
- Replace dots with a thin top **progress bar** (uses existing `Progress` component) — clearer "X% through."
- Add subtle slide-in animation between steps (Framer Motion is already in deps via shadcn).
- "Skip" → confirmation: "Skip the tour? You can replay it anytime from Settings." Prevents accidental skips.

### 6. Discoverability after completion
- After completion, show a one-time toast: "Tour complete. Replay anytime from the ? button on the Dashboard."
- Keep the existing `?` header button + Settings entry.

## Out of scope (ask if you want)

- Inline coach marks pinned to specific UI elements (fragile on mobile, you already vetoed this).
- Video clips — keeps bundle small.
- Per-page contextual "first time on this screen" hints (separate "tips" system, larger lift).

## Files

- Edit: `src/components/tutorial/tutorial-steps.ts` — add `bullets?: string[]`, `proTip?: string`, `gradient` per step; reorder logic helper for role
- Edit: `src/components/tutorial/TutorialOverlay.tsx` — render bullets + pro tip, progress bar, skip confirmation, slide animation
- Edit: `src/hooks/useTutorial.tsx` — add `minimize()` / `resume()` state, move auto-start into provider, role-aware step list, post-completion toast
- New: `src/components/tutorial/TutorialMiniBar.tsx` — floating "Resume tour" pill
- New: `src/components/tutorial/SetupChecklistStep.tsx` — final interactive checklist step (queries crew/trucks/incidents counts)
- Edit: `src/App.tsx` — mount `<TutorialMiniBar />` alongside overlay
- Edit: `src/pages/Dashboard.tsx` — remove the now-redundant `maybeAutoStart` call (moves into provider)

