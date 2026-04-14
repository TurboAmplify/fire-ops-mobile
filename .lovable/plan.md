

# Move Settings to Header, Add 4th Nav Slot

## What changes

### 1. Remove "More/Settings" from bottom nav
The fixed last tab ("More") is removed from `BottomNav.tsx`. The bottom bar becomes: **Home + 4 customizable tabs** (up from 3).

### 2. Add settings gear icon to Dashboard header
In `src/pages/Dashboard.tsx`, pass a gear icon button as `headerRight` to `AppShell`. Tapping it navigates to `/settings`.

### 3. Update NavBarCustomizer to allow 4 selections
Change the max from 3 to 4 in `src/components/settings/NavBarCustomizer.tsx`. Update the help text accordingly.

### 4. Update default tabs
Default tabs become: Incidents, Payroll, Expenses, Shift Tickets (4 items).

### 5. Redirect cleanup
The `/more` route redirect in `App.tsx` stays (safety net), but nothing links to it anymore.

## Files changed
- `src/components/BottomNav.tsx` -- remove fixed "More" tab, render 4 middle tabs
- `src/pages/Dashboard.tsx` -- add gear icon in header that goes to `/settings`
- `src/components/settings/NavBarCustomizer.tsx` -- change max from 3 to 4, update defaults and text
- `src/components/AppShell.tsx` -- no changes needed (headerRight already supported)

## What will NOT change
- No shift ticket, form, save, or signature logic
- No database changes
- No routing changes (Settings page stays at `/settings`)
- All existing workflows preserved
- The full Settings page content unchanged

## Risk
Very low. Removing one fixed tab and adjusting a max count. The gear icon pattern is standard mobile UX.

