

# Fix: Delete and Re-create daldrich75@yahoo.com Account

## Problem
The account `daldrich75@yahoo.com` was created on April 2 (likely by the `auto_join_demo_org` trigger) with no password set. Login fails because there's nothing to authenticate against. Password reset emails aren't arriving.

## Plan

### Step 1: Clean up existing records
Using database insert tool (which supports DELETE/UPDATE):
1. Delete from `organization_members` where `user_id = '81444a20-21a3-4543-9f65-a8b3048fafd4'`
2. Delete from `profiles` where `id = '81444a20-21a3-4543-9f65-a8b3048fafd4'`
3. Delete from `auth.users` where `id = '81444a20-21a3-4543-9f65-a8b3048fafd4'`

### Step 2: Verify auto-confirm is on
Already enabled from a previous change. No email verification required -- signup works instantly.

### Step 3: User signs up fresh
- Go to the login page, tap "Sign up"
- Enter `daldrich75@yahoo.com` / `Bigjake2020!!`
- Account is created and logged in immediately (no email needed)

### Step 4: Auto-join organization
The `auto_join_demo_org` trigger will automatically add the new user to the organization as owner -- same access as the B Aldrich account. No manual invite needed.

### Step 5: Also update the pending invite status
Mark any existing invite for that email as "accepted" so it doesn't show up again.

## Technical details
- The `auto_join_demo_org` trigger fires on new `auth.users` inserts and adds users to org `00000000-0000-0000-0000-000000000001` automatically
- `handle_new_user` trigger creates a `profiles` row automatically
- Auto-confirm is already enabled, so no email verification step

