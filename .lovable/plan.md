

# Collapse Shift Ticket Form: Show Only What Matters

## The idea
Since header info and equipment info are auto-populated from the truck/incident, they're just noise when filling out a ticket. The user's real workflow is: set times, review crew, sign. Everything else should be collapsed by default but expandable if needed.

## Changes (all in `src/components/shift-tickets/ShiftTicketForm.tsx`)

### 1. Collapse Header Info and Equipment Info by default
- Wrap "Header Info" section in a Collapsible (from `@radix-ui/react-collapsible`, already exists at `src/components/ui/collapsible.tsx`)
- Wrap "Equipment Info" section in a Collapsible
- Wrap "Options" section in a Collapsible
- All three default to **closed**
- Show a one-line summary when collapsed (e.g. "Johnson Fire | E-123 | 2024 Ford F-550")
- Tap the row to expand and edit

### 2. Collapse Remarks by default
- Same pattern, collapsed with summary text if any remarks exist

### 3. Keep these sections always visible (open)
- **Equipment entries** (the time/date rows) -- this is the core data entry
- **Crew** (personnel entries + CrewSyncCard) -- the main workflow
- **Signatures** -- contractor sig inline, supervisor sig button stays as-is

### 4. Supervisor signature sheet stays unchanged
- The OF297FormPreview popup behavior is preserved exactly as-is

## Summary of collapsed vs visible

```text
[v] Header Info          <- collapsed, tap to expand
[v] Equipment Info       <- collapsed, tap to expand  
[v] Options              <- collapsed, tap to expand
[ ] Equipment (times)    <- ALWAYS OPEN
[ ] Crew                 <- ALWAYS OPEN
[v] Remarks              <- collapsed, tap to expand
[ ] Signatures           <- ALWAYS OPEN
```

## File changed
- `src/components/shift-tickets/ShiftTicketForm.tsx` -- import Collapsible, wrap 4 sections

## What stays the same
- All data, auto-save, dirty tracking, signature flow
- Supervisor sheet popup behavior unchanged
- Bottom action bar unchanged
- No database or routing changes

