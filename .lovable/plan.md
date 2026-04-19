

# FireOps HQ — Launch Readiness Audit

## TL;DR

**Not ready to ship today.** You're close (~80%) but have **3 launch-blockers**, several Apple-rejection risks, and a few polish items. Most are 1–2 hour fixes.

---

## CRITICAL — Must fix before any submission

### 1. New users get auto-added to "Dry Lightning" org
The `auto_join_demo_org` trigger on `profiles` is still active. **Every person who signs up gets dumped into your real production org as an admin.** This is catastrophic — strangers would see your incidents, crew, expenses.
**Fix:** Drop the trigger + function. New users go through `/org-setup` like the flow already supports.

### 2. `platform_settings` readable by all users (security scan finding)
SELECT policy is `true` — any authenticated user can read every platform setting. If you ever store a feature flag, kill switch, or internal config there, it leaks.
**Fix:** Change SELECT policy to `is_platform_admin(auth.uid())`.

### 3. No iOS permission usage descriptions documented
Apple **auto-rejects** apps that use the camera/photo library without `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` in `Info.plist`. You use camera in 8+ places. The Capacitor config doesn't set these and there's no native project committed.
**Fix:** Document the exact strings to add to `ios/App/App/Info.plist` before first Xcode build:
- `NSCameraUsageDescription`: "FireOps HQ uses the camera to capture receipts, truck photos, inspection photos, and crew portraits."
- `NSPhotoLibraryUsageDescription`: "FireOps HQ accesses your photo library to attach existing receipts, truck photos, and documents."

---

## HIGH — Apple rejection risks

### 4. Privacy policy says "Effective March 29, 2026" but you're at April 2026
Apple reviewers check this. Update to current date.

### 5. Privacy policy missing required disclosures
Apple requires you to list:
- What data is collected (you have this — partial)
- **Third parties** who receive data (you use Lovable AI / Google for receipt parsing — must disclose)
- **Account deletion** instructions (you have the button but policy doesn't mention it)
- Children's data policy (state "not directed at children under 13")

### 6. Tracking pixel / OG image points to a Lovable preview URL
`index.html` line 30–31: og:image hardcoded to `id-preview-...lovable.app`. When the published or store version loads, this still works but looks unprofessional in shares. Replace with a proper hosted image or your own domain asset.

### 7. App Store screenshot assets not generated
You have icons (`icons/store/`) but no actual screenshots showing the app on iPhone 6.7"/6.5"/5.5" displays. **Required** for submission.

---

## MEDIUM — Functional gaps

### 8. Multiple memberships UI exists but no test path
`Settings.tsx` shows an org switcher when `memberships.length > 1`, but signup flow puts everyone in one org. Once #1 is fixed, verify a user can be invited to a 2nd org and switch cleanly.

### 9. Offline queue silently drops mutations on first failure
`offline-queue.ts` line 81–83: if one mutation fails, it stops replaying *and leaves the rest in the queue forever* with no user notification. After 72h they expire silently. Crews in the field will lose data.
**Fix:** Skip failed mutation, continue with rest, surface errors in a "Sync issues" UI.

### 10. React forwardRef warning on every render
Console shows: `Function components cannot be given refs` from `BottomNav` → `ShiftTicketQuickAccess`. Not a crash but Apple reviewers see console errors during review and it counts against polish. ~10 min fix.

### 11. Account deletion deletes the whole org if you're the last admin
`delete_user_data` wipes the entire organization (incidents, expenses, crew, etc.) silently when the deleting user is the only admin. Users won't expect this. Either:
- Block deletion until they transfer ownership, OR
- Show a big warning: "This will also permanently delete your organization and all data for X members."

---

## LOW — Polish

- App version in Settings is hardcoded `"1.0.0"` — fine for v1, but wire to `package.json` for future
- No splash screen configured in Capacitor (defaults to white flash on launch)
- Support email `support@fireopshq.com` — verify the domain/inbox is actually live before submission
- No analytics/crash reporting (Sentry, etc.) — not required but you'll be flying blind on production crashes

---

## What's actually working well

- RLS policies are tight and well-structured (linter clean)
- Multi-tenant isolation via `get_user_org_ids` is correct
- Auth flow (signup, login, password reset, invite codes) is solid
- Edge functions properly verify JWTs and use service role only for admin actions
- Offline-tolerant query persistence via React Query
- Privacy policy + Terms + Support pages all exist and are reachable
- Account deletion flow exists end-to-end (rare for v1 apps)
- Capacitor config is correct (no `server.url`, no `cleartext`)
- All icon sizes generated for iOS + Android + store listings
- Touch targets, safe areas, no hover-only patterns — cross-platform clean
- No leftover TODOs or placeholder content in user-facing UI

---

## Recommended fix order

**Today (blockers):** #1, #2, #3
**Before TestFlight:** #4, #5, #9, #10, #11
**Before App Store submission:** #6, #7, take real screenshots on physical devices

---

## What I'd do next

If you approve, I'll start with #1, #2, and the docs for #3 — those three together take ~30 min and unblock everything else. Then we can tackle #5/#9/#10/#11 in a second pass and leave the screenshot/asset work for last.

