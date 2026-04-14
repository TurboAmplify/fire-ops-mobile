

# Fix: Mobile Zoom and Horizontal Overflow

## What changes

Three targeted CSS/HTML edits. No component logic, save behavior, or workflow changes.

### 1. Viewport meta tag (index.html)
Add `maximum-scale=1, user-scalable=no` to prevent iOS Safari from auto-zooming on input focus.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**Risk**: None. This is standard for Capacitor apps. Accessibility zoom is handled at the OS level, not browser level, in native wrappers.

### 2. Global overflow guard (src/index.css)
Add `overflow-x: hidden` to `html` and `body` to prevent any screen from scrolling sideways.

```css
html, body {
  overflow-x: hidden;
}
```

**Risk**: Very low. The app is single-column mobile layout -- there is no legitimate horizontal scroll. This only clips accidental spill from wide tables or grids.

### 3. Bump form input font sizes to 16px (src/index.css)
Add a global rule so all `input`, `select`, and `textarea` elements render at minimum 16px. This is the root cause of iOS auto-zoom -- Safari zooms any focused input below 16px.

```css
input, select, textarea {
  font-size: 16px;
}
```

**Risk assessment**:
- The shared `Input` component already uses `text-base` (16px) on mobile -- no change there.
- `SelectTrigger` uses `text-sm` (14px) -- bumped to 16px. Visually nearly identical, prevents zoom.
- `Textarea` uses `text-sm` -- bumped to 16px. Same reasoning.
- Inline inputs in `EquipmentEntryRow`, `PersonnelEntryRow`, `CrewSyncCard`, and `ShiftTicketForm` use `text-sm` -- bumped to 16px. These are in grid layouts with fixed gaps, so the 2px increase fits fine.
- The OF-297 preview uses `text-[11px]` inputs for supervisor name/RO fields. These are inside a form-like preview, not a Capacitor webview, so the global 16px rule will override them. This is acceptable -- those two fields will render slightly larger but still fit within their container.

### What is NOT changing
- No component files edited (no risk of breaking save/signature/sync logic)
- No shift ticket workflow changes
- No database or service changes
- Vertical scrolling behavior untouched

### Files changed
- `index.html` -- viewport meta tag only
- `src/index.css` -- 2 additions (overflow-x, font-size floor)

