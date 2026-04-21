# App Store / Play Store Review Notes

Paste the contents of the **Review Information** section below into App Store
Connect (and Google Play "Instructions for review") when you submit a build.

---

## Review Information

**Demo account:**
- Email: `appreview@fireopshq.com`
- Password: `FireOpsReview2026!`

This account is preloaded with sample data so reviewers see a non-empty experience:
- 3 crew members (Crew Boss, Engine Boss, Firefighter)
- 2 trucks (Type 6 engine + Type 3 engine)
- 1 active incident ("Caldor Ridge")
- 1 draft shift ticket attached to the active incident

The account belongs to a demo organization called "Demo Fire Co." — reviewers
will land directly on the Dashboard after sign-in. No invite code or org setup
is required.

### What to test

1. **Sign in** with the credentials above — lands on Dashboard.
2. **Incidents** tab — open "Caldor Ridge" → tap the assigned truck → open the
   draft shift ticket → review form, signatures, export PDF.
3. **Expenses** tab — tap "+" → "Take or attach photo" — this is the only
   place camera permission is requested. The prompt uses the `NSCameraUsage
   Description` string from `Info.plist`.
4. **Crew** tab — view crew, tap "+" to add.
5. **Fleet** tab — view trucks, tap one for detail / inspection flow.
6. **More → Settings → Sign out** to end the session.

### Permissions

The app requests permissions **only on user action**, never at launch:
- **Camera** (`NSCameraUsageDescription`) — requested when the user taps
  "Take Photo" or "Scan receipt".
- **Photo Library** (`NSPhotoLibraryUsageDescription`) — requested when the
  user taps "Choose from library".
- **Photo Library Add** (`NSPhotoLibraryAddUsageDescription`) — requested
  when the user exports a shift ticket PDF and chooses "Save to Photos".

### Offline behavior

The app is offline-tolerant. Reviewers can:
1. Open the app online once so data caches.
2. Enable Airplane Mode.
3. Open Expenses → create a new expense → save.
   The expense queues locally; an offline banner appears.
4. Disable Airplane Mode — the expense syncs automatically.

### Account deletion

Settings → Account → Delete Account performs a full data wipe via the
`delete-account` edge function. Required by App Store Guideline 5.1.1(v).

---

## How to (re)create the demo account

1. Sign up in the app with `appreview@fireopshq.com`.
2. After email confirmation, sign in.
3. Create a new organization called "Demo Fire Co.".
4. From the Crew tab add 3 members, from Fleet add 2 trucks, from Incidents
   create one active incident, and from the incident add a truck and start
   one shift ticket (leave it in Draft).
5. Sign out — the account is now ready for reviewers.

If sample data is wiped between submissions, repeat step 4 before submitting
the next build.

---

## Pre-Submission Checklist (every build)

1. [ ] Demo account `appreview@fireopshq.com` can sign in
2. [ ] Demo account has all sample data listed above
3. [ ] Privacy Policy at `/privacy` loads without sign-in
4. [ ] Support page at `/support` loads (after sign-in is fine)
5. [ ] Permission strings in `despia.json` haven't drifted from this doc
6. [ ] App version in `package.json` and `despia.json` match the build
       you're submitting

## Future change — Sign in with Apple

The app currently offers **only email/password** sign-in, which means
**Sign in with Apple is NOT required** (Apple Guideline 4.8 only triggers
it when you offer Google, Facebook, or other third-party social sign-in).

If you ever add Google sign-in (or any social provider) you must add Sign
in with Apple at the same time, in the same release, or Apple will reject
the update.

