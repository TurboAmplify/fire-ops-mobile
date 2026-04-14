

# Combine Equipment Time + Crew Sync into One Card, Crew on Top

## What changes

### 1. Reorder sections in `ShiftTicketForm.tsx`
Move **Crew (personnel entries)** above the combined equipment/sync card. New order:
1. Chip row (Header, Equipment, Options, Remarks drawers)
2. **Crew** section (personnel entries list + Add Crew button)
3. **Combined Time + Sync card** (single bordered card)
4. Signatures

### 2. Merge Equipment Time + CrewSyncCard into one card in `ShiftTicketForm.tsx`
Instead of two separate boxes (Equipment Time card + CrewSyncCard), wrap them in a single `rounded-xl border` card:
- Top: "Equipment Time" header + date/start/stop/total fields + Add Row
- Divider line
- Bottom: the compact chip row (Work/Lunch/Lodging/PD) + conditional inputs + Apply button
- Remove the separate `<CrewSyncCard>` component call and inline its content, OR pass it as children -- cleanest is to keep CrewSyncCard but remove its outer border and nest it inside the equipment card

### 3. Clean up CrewSyncCard styling in `CrewSyncCard.tsx`
- Remove the outer `border-2 border-primary/30 bg-primary/5` wrapper (parent card handles the border now)
- Tighten chip spacing slightly
- Make the "PD:" label and chips flow more naturally (remove the separate label, just group B/L/D after a thin divider dot)

## Layout

```text
BEFORE (3 separate sections):
┌─ Equipment Time ──────────┐
│ Date | Start | Stop       │
└───────────────────────────┘
┌─ CrewSyncCard (bordered) ─┐
│ [Work] [Lunch] [Lodging]  │
│ [Apply to All Crew]       │
└───────────────────────────┘
┌─ Crew ────────────────────┐
│ Personnel rows...         │
└───────────────────────────┘

AFTER (crew on top, time+sync merged):
┌─ Crew ────────────────────┐
│ Personnel rows...         │
└───────────────────────────┘
┌─ Time + Crew Sync ────────┐
│ Date | Start | Stop       │
│ ────────────────────────  │
│ [Work] [Lunch] [Lodging]  │
│ [Apply to All Crew]       │
└───────────────────────────┘
```

## Files changed
- `src/components/shift-tickets/ShiftTicketForm.tsx` -- reorder sections, wrap equipment + sync in one card
- `src/components/shift-tickets/CrewSyncCard.tsx` -- remove outer border/bg (parent provides it), tighten chip layout

