# Despia Setup — FireOps HQ (No Mac Required)

You're shipping FireOps HQ to the App Store and Play Store using **Despia**
instead of Xcode/Android Studio. This doc covers everything Apple and Google
require that lives **outside** the web codebase.

---

## 1. Point Despia at the published app

In the Despia dashboard:

| Field | Value |
|---|---|
| App name | `FireOps HQ` |
| Bundle ID / App ID | `com.fireopshq.app` |
| Web app URL | `https://app.fireopshq.com` |
| App version | `1.0.0` |
| Minimum iOS version | `16.0` |
| Android target SDK | `34` |

These same values are in `despia.json` at the project root if Despia supports
importing a config file.

---

## 2. iOS permission strings (REQUIRED — Apple auto-rejects without these)

In Despia → iOS → Permissions, paste these **exactly**:

**`NSCameraUsageDescription`**
```
FireOps HQ uses the camera to capture receipts, truck photos, inspection photos, crew portraits, and signed documents in the field.
```

**`NSPhotoLibraryUsageDescription`**
```
FireOps HQ accesses your photo library so you can attach existing receipts, truck photos, inspection photos, and operational documents.
```

**`NSPhotoLibraryAddUsageDescription`**
```
FireOps HQ saves shift ticket PDFs and receipt copies to your photo library when you choose to export them.
```

> Why three? Apple treats camera, "read photo library", and "write to photo
> library" as three separate permissions. Missing any one of them = automatic
> rejection the first time the app tries to use that feature.

---

## 3. Android permissions

In Despia → Android → Permissions, enable:

- `CAMERA` — for receipts, truck photos, inspections, signatures
- `READ_MEDIA_IMAGES` (Android 13+) and `READ_EXTERNAL_STORAGE` (Android 12 and lower)
- `WRITE_EXTERNAL_STORAGE` — for saving exported PDFs
- `INTERNET` and `ACCESS_NETWORK_STATE` — usually enabled by default

---

## 4. App icons and splash screen

Despia will generate all required icon sizes from a single source image.

Upload as the source icon: `public/icon-512.png` (512×512). For the App
Store's required 1024×1024 marketing icon, upload `public/icon-512.png`
upscaled to 1024×1024 with no transparency (Despia can usually do this for
you).

Splash background color: `#0A0A0A` (matches the app's dark theme — already
set in `capacitor.config.ts`).

---

## 5. Build, test, and submit

1. In Despia, click **Build iOS** → wait for the `.ipa` file
2. In Despia, click **Build Android** → wait for the `.aab` file (Play Store
   requires `.aab`, not `.apk`)
3. Test the iOS build on a real iPhone via TestFlight (Despia walks you
   through this) — verify:
   - Sign-in works
   - Receipt photo prompt shows the exact permission string from above
   - Sign-out works
4. Submit via App Store Connect using the review notes from
   `docs/app-review-notes.md`
5. Submit the `.aab` via Google Play Console

---

## 6. App Store Connect / Play Console — the parts only you can fill in

Use these companion docs:

- `docs/app-review-notes.md` — paste into "App Review Information"
- `docs/app-privacy-questionnaire.md` — answers for App Privacy questionnaire
- `public/icons/store/SCREENSHOTS.md` — which screenshots to upload in what
  order

URLs to paste into App Store Connect:

| Field | URL |
|---|---|
| Privacy Policy URL | `https://fireopshq.com/privacy` |
| Support URL | `https://fireopshq.com/support` |
| Marketing URL (optional) | `https://fireopshq.com` |

---

## 7. Updating the app later

When you ship updates:

1. Publish your latest changes from Lovable (frontend changes go live on
   the `.lovable.app` URL)
2. Bump `appVersion` in `despia.json` and `package.json` (e.g. `1.0.1`)
3. In Despia, click **Build** again
4. Upload the new build to App Store Connect / Play Console
5. Submit for review with a "What's new" note

Most updates won't require resubmission of the binary — Despia loads your
web app from `https://app.fireopshq.com`, so frontend-only changes go live
the moment you publish updates. You only need a new binary when you change
permissions, icons, the splash screen, or the app version number.
