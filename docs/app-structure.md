# App Structure — FireOps HQ

## Platform Target

- Mobile-first, cross-platform (iOS + Android)
- Packaged via Capacitor for App Store and Google Play
- Web version available as fallback

---

## Main Navigation

Bottom tab bar (5 tabs max for both platforms):

1. Dashboard
2. Incidents
3. Time
4. Expenses
5. More (Crew, Fleet, Settings)

---

## Screen Breakdown

### Dashboard

- Active incidents
- Quick stats (hours, expenses)
- Alerts (missing data, expiring items)

---

### Incidents

- List of incidents
- Create incident
- Incident detail:
  - assigned trucks (with crew per truck)
  - shifts
  - summary stats

---

### Time

- Log new entry
- View by incident
- View by crew member

---

### Expenses

- Add receipt (camera or file picker — platform-neutral)
- View list
- Filter by category / incident

---

### Crew (under More)

- List of personnel
- Detail view
- Assignments

---

### Fleet (under More)

- List of trucks
- Status
- Notes

---

## Design Principles

- Keep screens simple
- Avoid deep navigation
- Prefer flat structure
- Optimize for speed and minimal taps
- Use platform-neutral UI patterns (no iOS-only or Android-only conventions)
- Bottom sheets and modals over new screens where possible

## Cross-Platform UI Rules

- Use standard bottom tab navigation (works on both platforms)
- No swipe-to-go-back assumptions — always provide visible back buttons
- Touch targets minimum 44×44 CSS pixels
- No hover states — all interactions are tap-based
- Use system-agnostic icons (Lucide) — no SF Symbols or Material-only icons
- Respect safe areas (notch, home indicator, navigation bar) via CSS env()
- Keyboard-aware layouts for all form screens
- Use `<input type="file" accept="image/*">` for photos — works on both platforms via Capacitor
- Never request permissions (camera, location, etc.) until the moment they're needed
