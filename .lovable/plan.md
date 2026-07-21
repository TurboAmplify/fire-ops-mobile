
## Goal
Give Kaylee Aldrich admin access to Dry Lightning so she can sign up through the PWA using an invite code.

## Email confirmation
The dictated email came through as "Kaylee Aldrich 90@gmail.com". I'll use **kayleealdrich90@gmail.com** (spaces removed). Tell me if that's wrong before I run it.

## Steps
1. Create a pending row in `organization_invites` for Dry Lightning:
   - `email`: kayleealdrich90@gmail.com
   - `role`: admin
   - `code`: `KALDRICHDL` (short, memorable, easy to text)
   - `status`: pending
2. Verify no existing auth user or membership for that email (so signup will cleanly attach).
3. Give you the code to text her.

## What she does (PWA — same as App Store flow)
1. Open https://app.fireopshq.com in her mobile browser → Add to Home Screen.
2. Tap **Join your team** on the login screen.
3. Enter email `kayleealdrich90@gmail.com`, code `KALDRICHDL`, and set a password.
4. The `handle_new_user` trigger will auto-attach her to Dry Lightning as admin — no extra step needed.

## Fallback
If she has any trouble, I can hard-provision her account (like Sheldon/John) with a temp password via `admin-provision-user` and confirm the membership directly.
