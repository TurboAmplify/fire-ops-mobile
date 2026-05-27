## Goal

Make the Red Card feel like the headline of the crew member's profile, and let the user tap it to view full-screen, then return to the crew detail easily.

## Plan

### 1. Make the Red Card visually prominent in the Detail sheet

- Move the Red Card section above the contact rows (right under name + role) so it's the first thing seen.
- Wrap the existing `RedCardCard` in a tap target with:
  - `active:scale-[0.98]` press feedback
  - subtle ring/shadow to signal it's interactive
  - small "Tap to expand" hint chip in the top-right corner
- Tapping anywhere on the card opens the full-screen viewer.

### 2. New full-screen Red Card viewer

New component `src/components/crew/RedCardViewer.tsx`:
- Fixed overlay at `z-[70]` (sits above the Detail sheet at `z-[60]`).
- Safe-area-aware top bar with:
  - **Back chevron + "Back"** on the left (closes viewer, returns to Detail)
  - Member name centered (truncated)
  - Close (X) on the right — both work, back is the primary
- Scrollable body that renders the existing `RedCardCard` at full mobile width with comfortable padding so front + back of the card are both viewable.
- Pinch/zoom is left to the OS (native image gestures on the card's photo); we don't intercept.
- Hardware back button / Esc / swipe-down on overlay all close the viewer (not the underlying Detail sheet).
- Locks body scroll while open; restores on close.

### 3. Wiring

- `CrewMemberDetail.tsx`: add `const [zoomed, setZoomed] = useState(false)`. Wrap the `RedCardCard` block in a `<button>` that calls `setZoomed(true)`. Render `<RedCardViewer ... />` when `zoomed` is true.
- No changes to `Crew.tsx`, the editor, or the data layer.
- The "Edit" button stays in the Detail sheet header — the full-screen viewer is view-only by design.

## Files

**New**
- `src/components/crew/RedCardViewer.tsx`

**Edited**
- `src/components/crew/CrewMemberDetail.tsx` — reorder so Red Card sits above contact rows, make it tappable, mount the viewer.

## Out of scope

- No editing from the full-screen viewer (admins still edit via the Detail sheet's Edit button → existing form).
- No download/share/print yet — easy to add later if asked.
- No data model changes.
