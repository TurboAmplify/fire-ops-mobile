

# Glassmorphism + Depth Polish for Dashboard

## The vision
Subtle glassmorphism and depth effects that feel like a premium command center without going sci-fi. Think Apple Vision Pro meets field ops -- frosted surfaces, soft glows, and layered depth. Clean, professional, cutting-edge.

## Changes

### 1. Grid tiles -- frosted glass with subtle glow
Replace flat `bg-card` tiles with translucent glass surfaces. Each tile gets a faint colored inner glow matching its icon color, creating a "lit from within" effect.

- `backdrop-blur-xl bg-white/[0.06]` (dark) / `bg-white/60` (light)
- Thin `border border-white/10` for the glass edge
- Subtle `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]` for the top-edge highlight
- Icon backgrounds get slightly more vibrancy: `bg-destructive/15` instead of `/12`
- On press: scale down + glow dims (already have `active:scale-[0.98]`)

### 2. Active incident cards -- glass + ember glow
The horizontal scroll cards get the same glass treatment plus a faint warm glow on the left border (like embers):

- `border-l-2 border-destructive/40` for the ember accent
- Same frosted glass background
- The pulse dot already looks great, keep it

### 3. Section headers -- subtle gradient text
The "Operations" and "Active Incidents" labels get a very subtle gradient or just slightly brighter opacity to feel more premium. Keep them uppercase and small.

### 4. Background -- subtle mesh gradient
Add a very faint radial gradient overlay to the dashboard background behind the grid. A soft warm spot (fire-orange at ~3% opacity) near the top and a cool spot (blue at ~2% opacity) at the bottom. This adds dimensionality without being distracting.

### 5. Divider -- glow line
The gradient divider between sections gets a slight glow effect: `shadow-[0_0_8px_rgba(var(--primary),0.1)]` to feel like a subtle light seam.

### 6. Bottom nav + header -- enhanced glass
Already using `glass` class. Add a subtle top-edge highlight to the header (`shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]`) and same for bottom nav's top border.

## Implementation
All changes are CSS/className only in two files:
- `src/pages/Dashboard.tsx` -- tile styles, card styles, background gradient div
- `src/index.css` -- add a `.glass-tile` utility class for reuse

## What will NOT change
- No layout changes (grid stays 2x3)
- No logic, routing, or data changes
- No database changes
- Touch targets unchanged
- All navigation preserved

