# Incident Detail — UX overhaul (round 4)

Goal: make creating shift tickets the fastest possible action, hide noise until it's relevant, and tighten the incident header so the page feels professional and intentional.

---

## 1. Tighten the top of the incident page

- **Stat strip → compact, one line.** Replace the 4-stat card with a single row: `Location · Start Date` (acres / containment only show if set, inline). Removes a tall card that mostly shows two values.
- **Hide OF-286 entirely** unless `status` is `demob` or `closed`. No upload card, no banner on active incidents — it's irrelevant noise during the fire.
- **Remove the duplicate "Missing OF-286" banner** at the top of the page. The OF-286 card itself already communicates state via color and copy when it appears.

Result: less than half the vertical space before tabs start.

---

## 2. Promote Shift Tickets to a top-level tab

Tabs become: `Overview` · `Trucks` · **`Tickets`** · `Crew`

The new **Tickets tab** is purpose-built for the most common workflow — creating and reviewing shift tickets:

- **Big primary CTA at the top:** "+ New Shift Ticket" (one tap → if only 1 truck assigned, jumps straight to the form; if multiple, a quick truck picker bottom sheet).
- **Today's tickets** section — one card per truck showing today's draft/complete state, tap to resume.
- **Recent tickets** section — last 10 grouped by date, with the same compact card style we just built (status pill top-right, ⋯ menu).

Shift ticket creation is now **2 taps from anywhere in the app** instead of 5.

The Trucks tab still keeps the inline "OF-297 Shift Tickets" section per truck (no change), so the workflow you already know still works.

---

## 3. Redesign the bottom-nav Shift Tickets shortcut

Current: opens a dialog with a list (the part you don't love).

New: opens a focused **action sheet** (Uber/Lyft style):

```text
┌──────────────────────────────────┐
│  Shift Tickets                   │
├──────────────────────────────────┤
│  [ + Start New Shift Ticket ]    │  ← big primary button
│                                  │
│  CONTINUE TODAY                  │
│  ▸ DL31 · FB 17 · Draft          │  ← only today's open drafts
│  ▸ DL62 · FB 17 · Draft          │
│                                  │
│  View all tickets →              │  ← link, not a list
└──────────────────────────────────┘
```

Key changes:
- Default action is **start new**, not browse.
- Only **today's drafts** are surfaced (the thing you actually need to finish).
- Full history moved behind a "View all" link → routes to a new `/shift-tickets` page (uses the existing `ShiftTicketLog` if appropriate).
- "Start new" flow: if exactly 1 active incident + 1 truck, jump straight to the form. Otherwise show a 1-step picker.

---

## 4. Tickets tab — visual reference

```text
┌──────────────────────────────────┐
│  [ + New Shift Ticket ]          │  primary, full-width
│                                  │
│  TODAY                           │
│  ┌────────────────────────────┐ │
│  │ 🛻 DL31              Draft │ │
│  │    Apr 26 · 0 entries      │ │
│  └────────────────────────────┘ │
│                                  │
│  RECENT                          │
│  ┌────────────────────────────┐ │
│  │ 🛻 DL31           Complete │ │
│  │    Apr 25 · 8 hr · signed  │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## Technical notes

Files to edit:
- `src/pages/IncidentDetail.tsx` — collapse stat strip, hide OF-286 card unless demob/closed, remove duplicate banner, add Tickets tab.
- `src/components/incidents/IncidentTicketsTab.tsx` (new) — CTA + today + recent grouped lists, reusing `useShiftTickets` per truck.
- `src/components/shift-tickets/ShiftTicketQuickAccess.tsx` — rewrite to action-sheet pattern: big New CTA, today's drafts only, "View all" link.
- `src/pages/ShiftTicketLog.tsx` — confirm it already serves as the "All tickets" destination (already exists, just route to it).
- `src/components/incidents/OF286UploadCard.tsx` — no internal change; gating moves to `IncidentDetail`.

No DB changes. No new hooks needed (existing `useShiftTickets`, `useLatestTicketPerTruck`, `useRecentShiftTickets`, `useIncidentTrucks` cover it).

---

## What stays the same (intentionally)

- Truck cards in the Trucks tab — already cleaned up last round; the inline shift ticket section there stays so the truck-centric workflow still works.
- Daily Crew tab.
- Resource Orders rollup on Overview.
- Master Agreement in Org Settings.

---

## What you should test after

1. Open an active incident → page is noticeably shorter; no OF-286 card visible.
2. Set incident to Demob → OF-286 card appears in Overview.
3. Tap the bottom-nav Shift Tickets icon → big "Start New" button is the focus, not a list.
4. Tap the new "Tickets" tab on an incident → CTA at top, today's tickets visible, no expanding required.
5. With 1 truck assigned, tap "+ New Shift Ticket" → goes straight to the form (no picker).
