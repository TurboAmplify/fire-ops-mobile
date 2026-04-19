

## Plan: screenshot-based tutorial steps + fixed pro tips

### 1. Capture screenshots
Use browser at 390×844 to grab clean shots of the key screens (logged in as a user with sample data):
- Dashboard, Incidents, Shift Ticket Log, Crew, Fleet, Expenses, Needs

Save as `public/tutorial/{id}.png` (~80KB each, ~600KB total).

Welcome / Offline / Checklist steps stay icon-only — no specific screen.

### 2. Extend step schema (`tutorial-steps.ts`)
Add optional fields:
```ts
screenshot?: string;       // "/tutorial/incidents.png"
highlight?: {              // % positioned overlay
  top: string; left: string;
  width: string; height: string;
  label?: string;          // caption under screenshot
};
```

### 3. Render in `TutorialOverlay.tsx`
When `screenshot` present, replace the icon tile with a phone-frame container:
- Max-width 240px, aspect 9/19.5, rounded-2xl, border, shadow
- `<img>` fills frame
- Highlight `<div>` absolutely positioned with pulsing ring + spotlight cutout (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.45) inset` on a sibling mask)
- Caption ("Tap here to create an incident") below frame

Falls back to existing icon tile when no screenshot (welcome/offline/checklist).

### 4. Rewrite pro tips against real features
Audit each against actual code, then rewrite:

| Step | New pro tip |
|------|-------------|
| Incidents | (remove agreement-PDF tip) → "Tap any incident to assign trucks and crew, then jump straight into shift tickets." |
| Shift Tickets | Keep — drafts auto-save is real |
| Fleet | Verify `parse-truck-photo` works; if yes keep VIN tip, if no replace with "Daily inspections use templates you customize per truck type." |
| Expenses | Keep — Batch Scan is real |
| Crew | Add: "Tap a phone number to call directly from the field." |

I'll read `services/agreements.ts`, `parse-truck-photo/index.ts`, and the Crew components to confirm before finalizing tip copy.

### 5. Highlight coordinates per screen
Rough targets (refined after capture):
- Dashboard → bottom nav "Incidents" tab
- Incidents → "+" FAB
- Shift Tickets → "New ticket" button
- Crew → "+" FAB
- Fleet → first truck card / "+" FAB
- Expenses → "Scan receipt" button
- Needs → "+" add item button

### Files

- New: `public/tutorial/dashboard.png`, `incidents.png`, `shift-tickets.png`, `crew.png`, `fleet.png`, `expenses.png`, `needs.png`
- Edit: `src/components/tutorial/tutorial-steps.ts` — add screenshot/highlight fields, rewrite pro tips
- Edit: `src/components/tutorial/TutorialOverlay.tsx` — render phone-frame + highlight overlay when screenshot present

