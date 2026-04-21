# App Store Connect — App Privacy Questionnaire Answers

Apple requires you to declare every type of data your app collects, what you
use it for, and whether it's linked to the user's identity. Below are the
exact answers to paste into **App Store Connect → App Privacy → Edit**.

If anything below stops being accurate (e.g. you add analytics, ads, or a
new third-party service), update this doc *and* the App Store Connect entry.

---

## Does your app collect data?

**Yes.**

---

## Data Types Collected

### Contact Info → Email Address
- **Collected:** Yes
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality, Account Management

### User Content → Photos or Videos
- **Collected:** Yes
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality
- **Why:** Receipt photos, truck photos, inspection photos, crew portraits,
  and signed documents that the user explicitly attaches to operational
  records.

### User Content → Other User Content
- **Collected:** Yes
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality
- **Why:** Operational records the user creates — incidents, shifts,
  expenses, crew assignments, signatures, notes.

### Identifiers → User ID
- **Collected:** Yes
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality, Authentication

### Diagnostics → Crash Data
- **Collected:** Yes (basic, via Despia's wrapper / standard web logging)
- **Linked to user identity:** No
- **Used for tracking:** No
- **Purposes:** App Functionality

---

## Data NOT collected

Be explicit — Apple flags inconsistencies. Confirm the app does **NOT**
collect:

- Health & Fitness data
- Financial Info (no payments inside the app)
- Location (precise or coarse)
- Sensitive Info
- Contacts
- Browsing History
- Search History
- Audio Data
- Gameplay Content
- Customer Support data sent through the app
- Device IDs (other than the system-managed installation identifier)
- Advertising data
- Purchase history

---

## Tracking

**Does your app use data for tracking purposes?** **No.**

The app does not share user data with third parties for advertising or
cross-app tracking. There is no Identifier for Advertisers (IDFA) prompt.

---

## Third Parties That Process User Data

If App Store Connect asks you to list third-party SDKs / services:

| Service | Purpose | Data shared |
|---|---|---|
| **Supabase** (Lovable Cloud) | Hosts the database, authentication, file storage | All operational data, account email, uploaded files |
| **Lovable AI Gateway → Google Gemini** | Extracts structured fields from receipt and document images the user explicitly scans | Only the image the user chose to scan, sent at the moment they tap "Scan" |

Neither party uses the data for their own purposes, training, or advertising.

---

## Privacy Policy URL

`https://fire-buddy-mobile.lovable.app/privacy`

This URL must be live and reachable at the time of submission. The Privacy
Policy page is in `src/pages/Privacy.tsx`.

---

## Verification before submitting

- [ ] Privacy Policy URL loads in a browser without sign-in
- [ ] Every data type marked "Collected" above has a matching mention in
      the Privacy Policy
- [ ] No analytics, ads, or telemetry SDKs added since this doc was last
      updated
