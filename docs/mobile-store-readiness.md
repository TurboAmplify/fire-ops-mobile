# Mobile Store Readiness — FireOps HQ

> **Build path:** Despia (no Mac required). See `docs/despia-setup.md` for
> the step-by-step. Capacitor configs in the repo are kept up to date as a
> backup option in case you ever switch tooling.

---

## App Store (iOS) Requirements

- [x] App icons: 1024×1024 + all required sizes (`public/icons/ios/`)
- [x] Splash/launch screen (configured in `capacitor.config.ts`,
      Despia replicates this from the launch background color)
- [x] Privacy policy URL — `/privacy` route, live in app
- [x] Support URL or email — `/support` route, live in app
- [x] No placeholder or "Coming Soon" content (audited and removed)
- [x] All visible flows are functional
- [x] Permissions requested only at point of use (HTML `capture=` triggers
      iOS prompt only when the user taps a photo button)
- [x] Permission usage strings prepared in `despia.json` and
      `docs/despia-setup.md`
- [x] Account deletion flow live (`Settings → Delete Account`)
- [x] Minimum deployment target documented as iOS 16+
- [ ] **You:** Test on a physical iPhone via Despia's TestFlight build

## Google Play (Android) Requirements

- [x] App icons: 512×512 + adaptive icon (`public/icons/android/`)
- [x] Privacy policy URL — `/privacy` route
- [x] Target SDK: 34 (set in `despia.json`)
- [x] No placeholder content
- [ ] **You:** Feature graphic (1024×500) — generate before submission
- [ ] **You:** Content rating questionnaire in Play Console
- [ ] **You:** Test on a physical Android device via Despia's build

---

## Cross-Platform Checklist

### Navigation & UI
- [x] Bottom tab bar works on both platforms
- [x] Back navigation uses visible buttons (`AppShell` chevron)
- [x] Safe areas respected (`safe-area-top`, `safe-area-bottom` classes)
- [x] No platform-specific UI libraries
- [x] Touch targets ≥ 44×44 (`.touch-target` utility class)

### Permissions
- [x] Camera: requested only on tap (HTML `capture=` attribute)
- [x] No location requests
- [x] No notification permission requests
- [x] Permission strings in `despia.json` are clear and accurate

### Photos & Attachments
- [x] Uses `<input type="file" accept="image/*">` — works on both platforms
- [x] No assumption about file paths
- [x] Permission denial is graceful (input simply does nothing)

### Performance
- [x] Initial load uses skeleton + offline cache
- [x] Smooth scroll on iOS (no overscroll quirks)
- [x] Offline-tolerant — IndexedDB cache + mutation queue

### Data & Privacy
- [x] Privacy policy in app + linked from Settings
- [x] No sensitive data in unencrypted local storage (auth tokens managed
      by Supabase SDK)
- [x] User data deletion flow (Settings → Delete Account →
      `delete-account` edge function)
- [x] HTTPS for all network requests

---

## Pre-Submission Final QA

1. [ ] Test all core flows on a physical iPhone (Despia TestFlight build)
2. [ ] Test all core flows on a physical Android device (Despia internal
       testing track)
3. [ ] Verify camera/photo prompt shows the exact text from
       `despia.json → ios.permissions.NSCameraUsageDescription`
4. [ ] Confirm offline behavior: airplane mode → app loads cached data,
       new edits queue and sync on reconnect
5. [ ] All screens render correctly with the iPhone notch + home indicator
6. [ ] No console errors or crashes
7. [ ] Privacy policy and support links open without auth
8. [ ] Demo account (`appreview@fireopshq.com`) exists and is seeded with
       sample data per `docs/app-review-notes.md`
9. [ ] App Privacy questionnaire filled in per
       `docs/app-privacy-questionnaire.md`

---

## Companion Documents

- `docs/despia-setup.md` — full Despia build & submission walkthrough
- `docs/app-review-notes.md` — paste into App Review Information
- `docs/app-privacy-questionnaire.md` — App Store Connect privacy answers
- `docs/ios-permissions.md` — kept as backup (Capacitor/Xcode reference)
- `public/icons/store/SCREENSHOTS.md` — store screenshot upload order
