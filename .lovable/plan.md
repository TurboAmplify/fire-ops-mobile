

User picked Option B: a self-add button on the Super Admin → Org Detail page. Looking at the existing code:

- `SuperAdminOrgDetail.tsx` already has the org context, members list, and a "View as this org" button — natural place to add this.
- `is_real_org_member()` already exists; once I'm a real member, the existing `guard_platform_admin_write` trigger lets me write to that org without any other changes.
- `platform_admin_audit` + `admin_log_action` RPC already exist for audit logging.
- `organization_members` insert RLS requires `is_org_admin` OR a valid invite — platform admins satisfy `is_org_admin` via the function definition, so a direct insert works. But to keep it clean, audited, and self-contained, I'll add a dedicated SECURITY DEFINER RPC.

Plan stays small: 1 RPC + 1 button + 1 mutation.

---

# Self-add to org as platform admin support

## What you'll get

On the Super Admin → Org Detail page, next to the existing "View as this org" button, a new **"Add me as admin"** button (with a confirm dialog asking for an optional reason). One click and:
1. You're inserted into `organization_members` as `admin` for that org.
2. The action is logged to `platform_admin_audit` with the reason.
3. You can now write to that org normally — uploads, edits, everything works.
4. Page refreshes so the members list shows you immediately.

When you're already a member, the button changes to **"Remove me from this org"** so cleanup is one click too (also audited).

## Backend (1 migration)

New SECURITY DEFINER RPCs, callable only by platform admins:

- `admin_self_add_to_org(_org_id uuid, _reason text)` 
  - Verifies caller is platform admin (else `42501`)
  - Inserts `organization_members(org_id, auth.uid(), 'admin')` if not already present
  - Inserts `platform_admin_audit` row with `action='self_add_to_org'`, target_id, reason
  - Returns the new membership id

- `admin_self_remove_from_org(_org_id uuid, _reason text)`
  - Verifies caller is platform admin
  - Deletes own row from `organization_members` for that org
  - Logs to `platform_admin_audit` with `action='self_remove_from_org'`

Both run as SECURITY DEFINER so RLS doesn't get in the way, and both write audit rows in the same transaction so there's no way to add/remove without a record.

## Frontend (1 file: `src/pages/SuperAdminOrgDetail.tsx`)

- Detect "am I already a member?" by checking if `auth.uid()` appears in `data.members`.
- Add a button in the header (alongside "View as this org"):
  - If not a member: `"Add me as admin"` (default variant, primary color)
  - If already a member: `"Remove me from org"` (outline variant, destructive color)
- Click opens a small AlertDialog asking for an optional reason ("Helping customer fix duplicate incident") before submitting.
- On success: toast, invalidate the org detail query so the members list refreshes.
- On error: toast with the message.

## Why this is safe

- Every add/remove is a platform-admin-only RPC with audit trail (actor, time, reason).
- You become a real member, so the existing `guard_platform_admin_write` trigger already allows your writes — no new bypass logic.
- All your actions while a member appear in normal org audit/activity logs under your name (not impersonated).
- Reversible in one click.
- No new attack surface: anyone who is already a platform admin could already do this manually via SQL; this just makes it one click and forces an audit record.

## Files

- New migration: add the two RPCs + grants
- Edit: `src/pages/SuperAdminOrgDetail.tsx` (button + dialog + mutation)

That's it. After you approve, I'll implement and you can test on Dry Lightning.

