# Mobile Store Readiness — FireOps HQ

## Packaging

- Use **Capacitor** to wrap the web app for iOS and Android
- Single codebase → two native shells
- Native plugins only when needed (camera, file system, push notifications)

---

## App Store (iOS) Requirements

- [ ] App icons: 1024×1024 (App Store) + all required sizes
- [ ] Splash/launch screen
- [ ] Privacy policy URL (required)
- [ ] Support URL or email (required)
- [ ] No placeholder content or lorem ipsum
- [ ] All flows must be functional — Apple rejects incomplete features
- [ ] Request permissions only at point of use with clear purpose strings
- [ ] Minimum deployment target: iOS 16+
- [ ] Test on physical iPhone before submission

## Google Play (Android) Requirements

- [ ] App icons: 512×512 (Play Store) + adaptive icon assets
- [ ] Feature graphic: 1024×500
- [ ] Privacy policy URL (required)
- [ ] Target SDK: latest stable (API 34+)
- [ ] Content rating questionnaire completed
- [ ] No placeholder content
- [ ] Test on physical Android device before submission

---

## Cross-Platform Checklist

### Navigation & UI
- [ ] Bottom tab bar works on both platforms
- [ ] Back navigation uses visible buttons, not swipe-only
- [ ] Safe areas respected (notch, home indicator, nav bar)
- [ ] No platform-specific UI libraries (no iOS-only or Android-only patterns)
- [ ] Touch targets ≥ 44×44 CSS pixels

### Permissions
- [ ] Camera: requested only when user taps "Take Photo" or "Attach Receipt"
- [ ] Location: not requested unless explicitly needed
- [ ] Notifications: requested only after user sees value (not on first launch)
- [ ] All permission prompts include clear reason strings for both platforms

### Photos & Attachments
- [ ] Use `<input type="file" accept="image/*">` or Capacitor Camera plugin
- [ ] Works with both camera and photo library on both platforms
- [ ] No assumption about file paths or gallery structure
- [ ] Handle permission denial gracefully (show message, don't crash)

### Performance
- [ ] Fast initial load (< 3 seconds on mid-range device)
- [ ] Smooth scrolling on lists with 100+ items
- [ ] No janky animations or layout shifts
- [ ] Offline-tolerant: app doesn't crash without connectivity

### Data & Privacy
- [ ] Privacy policy page accessible from within the app
- [ ] No sensitive data in local storage without encryption
- [ ] User data deletion flow (required by both stores)
- [ ] HTTPS for all network requests

---

## Capacitor Configuration Notes

- App ID: `app.lovable.63e454bc32e142ee9def17eb4240739a`
- Build target: Vite output (`dist/`)
- Native platforms added via `npx cap add ios` / `npx cap add android`
- Sync after every build: `npx cap sync`
- Test with: `npx cap run ios` / `npx cap run android`

---

## Pre-Submission Final QA

1. Test all core flows on a physical iPhone and Android phone
2. Verify camera/photo attachment works on both platforms
3. Confirm offline behavior (app loads, shows cached data or graceful error)
4. Check all screens for safe area compliance
5. Verify no console errors or crashes
6. Confirm privacy policy and support links are live
