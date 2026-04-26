# FireOps HQ — App Store Submission Checklist

Follow this top-to-bottom. Every item is verified or documented elsewhere
in the repo. Estimated time end-to-end (assuming TestFlight cooperates):
**3–5 hours of active work spread across 1–3 days of waiting on Apple.**

---

## 0. Before you start

You'll need:
- An **Apple Developer Program** account ($99/year) — must be fully active
- The **Despia** dashboard logged in
- **Transporter** app installed on your Mac (free, App Store) — for uploading the `.ipa`
- Your marketing site live at `https://fireopshq.com` with `/privacy`, `/support`, `/terms` reachable without login

---

## 1. Marketing site sanity check (5 min)

Open these in an incognito browser — they must load without sign-in:

- [ ] `https://fireopshq.com/privacy`
- [ ] `https://fireopshq.com/support`
- [ ] `https://fireopshq.com/terms`

Apple's reviewer will click these from the App Store listing. If any 404,
the submission gets rejected on Guideline 5.1.1.

---

## 2. App build via Despia (15 min + ~30 min build wait)

In the Despia dashboard:

| Field | Value |
|---|---|
| App name | `FireOps HQ` |
| Bundle ID | `com.fireopshq.app` |
| Web app URL | `https://app.fireopshq.com` |
| Version | `1.0.0` |
| Build number | `1` (increment for every resubmission) |
| Minimum iOS | `16.0` |

**iOS permission strings** (Despia should pre-fill from the URL, but verify):
- Camera: "FireOps HQ uses the camera to capture receipts, truck photos, inspection photos, crew portraits, and signed documents in the field."
- Photo Library: "FireOps HQ accesses your photo library so you can attach existing receipts, truck photos, inspection photos, and operational documents."
- Photo Library Add: "FireOps HQ saves shift ticket PDFs and receipt copies to your photo library when you choose to export them."

**App icon**: Despia accepts a single 1024×1024 PNG and generates the rest.
Use `public/icons/store/appstore-1024.png`.

Trigger the iOS build. Despia emails you when the `.ipa` is ready.

---

## 3. Upload to App Store Connect (10 min)

1. In App Store Connect, create a new app:
   - Platform: **iOS**
   - Name: `FireOps HQ`
   - Primary language: **English (U.S.)**
   - Bundle ID: `com.fireopshq.app` (must match Despia exactly)
   - SKU: `fireopshq-ios-1` (any unique string)
   - User Access: **Full Access**
2. Open **Transporter** on Mac → drag the `.ipa` from Despia → **Deliver**
3. Wait ~10–30 min for it to appear in App Store Connect under
   **TestFlight → Builds**
4. Meanwhile, fill in the metadata below

---

## 4. App Store Connect metadata (paste in)

### App Information

- **Subtitle (30 char max)**: `Wildfire crew operations`
- **Category (Primary)**: `Business`
- **Category (Secondary)**: `Productivity`
- **Content Rights**: Does not contain third-party content
- **Age Rating**: 4+ (no objectionable content; complete the questionnaire as
  "None" for every row)

### Pricing

- **Price**: Free
- **Availability**: All countries (or US-only if you want a phased rollout)

### App Privacy

Use the answers in `docs/app-privacy-questionnaire.md` — every field is
pre-written. **Privacy Policy URL**: `https://fireopshq.com/privacy`

### Version Information

- **Promotional Text (170 char)**:
  > Built for crews in the field. Track shifts, expenses, fleet, and
  > incidents on your phone — works offline, syncs when you're back.

- **Description**:
  > FireOps HQ is the operations app for wildland firefighting crews,
  > contractors, and volunteer departments.
  >
  > Built for the field, not the office. Track everything you need —
  > shifts, expenses, fleet, crew assignments, incidents — from your phone.
  >
  > KEY FEATURES
  >
  > • OF-297 Shift Tickets — Capture equipment time, personnel hours, and
  > signatures digitally. Export the official PDF anytime.
  > • Incident Management — Track active fires with acres, containment,
  > and crew assignments in real time.
  > • Crew & Fleet — Roster, roles, truck assignments, inspections, and
  > documents in one place.
  > • Expenses & Receipts — Snap a photo of a receipt and it's logged.
  > Categorize, attach to incidents, and export.
  > • Payroll-Ready — Hours flow straight from shift tickets to pay
  > calculations with H&W rates and overtime support.
  > • Works Offline — Designed for fire camp signal. Everything queues
  > and syncs when you're back online.
  >
  > FOR
  >
  > • Wildland fire contractors
  > • Volunteer fire departments accepting assignments
  > • State and local agency wildland crews
  >
  > Your data stays in your organization. No ads, no tracking.

- **Keywords (100 char total, comma-separated)**:
  `wildfire,wildland,fire,crew,OF-297,shift ticket,fleet,incident,fireops,contractor`

- **Support URL**: `https://fireopshq.com/support`
- **Marketing URL**: `https://fireopshq.com` (optional)

### Build

- Select the build Transporter uploaded
- **Encryption**: Answer "No" to the export compliance question
  (HTTPS to your own backend is exempt under the standard exemption)

### Screenshots

Upload from `public/icons/store/`:

| Slot | File |
|---|---|
| 1 | `screenshot-1-dashboard.png` |
| 2 | `screenshot-2-crew.png` |
| 3 | `screenshot-3-fleet.png` |
| 4 | `screenshot-4-offline.png` |
| 5 | `screenshot-5-incidents.png` |
| 6 | `screenshot-6-expenses.png` |
| 7 | `screenshot-7-shift-tickets.png` |
| 8 | `screenshot-8-audience.png` |

These are 1290×2796 (6.7" iPhone). Apple auto-scales for 6.5" and 5.5"
slots — you only need to upload one set.

### App Review Information

- **Sign-in required**: Yes
- **Demo account**:
  - Email: *create a fresh test account in your live app, e.g.* `appreview@fireopshq.com`
  - Password: *strong password*
  - Notes: "Demo account is in a sample organization with example incidents,
    crew, trucks, and shift tickets pre-populated. To explore Sign in with
    Apple, tap 'Continue with Apple' on the login screen."
- **Notes for reviewer**:
  > FireOps HQ is a B2B operations tool for wildland firefighting crews.
  > The app is offline-tolerant — if reviewers test in airplane mode,
  > queued actions will replay when reconnected. The Payroll module is
  > admin-gated and may not appear under all demo accounts.
  >
  > Account deletion is available at Settings → Delete Account.

- **Contact info**: your email + phone

---

## 5. Pre-submit verification (run through this list)

Configs:
- [x] `despia.json` → version 1.0.0, appId `com.fireopshq.app`, URL `app.fireopshq.com`
- [x] `package.json` → version 1.0.0
- [x] `capacitor.config.ts` → no dev `server.url`, splash configured

Backend:
- [x] All 9 storage buckets private with org-scoped RLS
- [x] Supabase linter clean
- [x] Security scan: 0 findings
- [x] Account deletion edge function deployed and reachable
- [x] HIBP leaked-password protection enabled

Code:
- [x] No `lovable.app` / `fire-buddy` references
- [x] No debug `console.log` in production paths (only error/warn for legitimate reporting)
- [x] Build passes clean
- [x] Apple sign-in button on login screen

Assets:
- [x] All 17 iOS icon sizes in `public/icons/ios/`
- [x] 1024×1024 marketing icon at `public/icons/store/appstore-1024.png`
- [x] 8 screenshots at 1290×2796 in `public/icons/store/`
- [x] Privacy questionnaire answers in `docs/app-privacy-questionnaire.md`

Marketing site (you, on Netlify):
- [ ] `fireopshq.com/privacy` live
- [ ] `fireopshq.com/support` live
- [ ] `fireopshq.com/terms` live
- [ ] DNS for `app.fireopshq.com` resolves and serves the live app

---

## 6. Submit (5 min)

1. App Store Connect → your app → **Submit for Review**
2. Answer the **Export Compliance** prompt: No
3. Answer **Content Rights**: No third-party content
4. Answer **Advertising Identifier**: No
5. Click **Submit**

Apple typically reviews within **24–48 hours** for first submissions, sometimes
longer. You'll get an email at every status change (Waiting for Review →
In Review → Approved / Rejected).

---

## 7. If rejected

Most common first-submission rejections and how to fix them fast:

| Reason | Fix |
|---|---|
| **Guideline 4.8 — Missing Sign in with Apple** | Already shipped. Verify the Apple button renders for the reviewer's region. |
| **Guideline 5.1.1(v) — Account deletion not obvious** | Already shipped at Settings → Delete Account. Mention this in reviewer notes if asked. |
| **Guideline 2.1 — Sign-in failed** | Verify the demo account is active and not seat-limited. Re-test the exact reviewer flow. |
| **Guideline 4.0 — Design / minimum functionality** | Add reviewer notes explaining the B2B context: this is a tool for working crews, not a consumer dashboard. |
| **Guideline 5.1.2 — Privacy policy doesn't match collected data** | Cross-check `app-privacy-questionnaire.md` against the live `/privacy` page on the marketing site. |

Resubmit with a build number bumped by 1 (e.g. `1.0.0 (2)`).

---

## 8. After approval

- Switch the App Store listing from **Manual** to **Automatic Release**
  (or keep manual and click **Release This Version** when ready).
- Tag the release in your repo: `v1.0.0`.
- Save the build's `.ipa` somewhere safe — useful for diff'ing future builds.

---

## What I'm not handling for you

These are deliberately yours because they require accounts/credentials I
don't have:

- Apple Developer Program enrollment
- Despia dashboard build trigger
- App Store Connect metadata entry (paste-ready above)
- Marketing site hosting (Netlify)
- Customer support inbox monitoring
