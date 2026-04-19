

You're now a real admin of Dry Lightning. Here's the situation and what I'd add.

## What you can do RIGHT NOW (no code changes needed)

Since you're a real `admin` member, RLS already lets you:
- Edit org name, tier, seat limit, modules, accepts_assignments → via `OrgSettings` page
- Manage members and invites
- Edit/create incidents, trucks, crew, expenses, shift tickets, etc. — anywhere in the app

**To get there:** the `OrgSettings` page lives at `/org-settings`, but right now it loads `useOrganization()` which returns whichever org you're a member of. Since you're a member of Dry Lightning now, just navigate to **More → Settings → Org Settings** (or `/org-settings`) and you'll be editing Dry Lightning.

If you're a member of multiple orgs, this is where it gets messy — `useOrganization` picks the first one (`limit(1)`), which may not be Dry Lightning. I'll check if that's a problem for you.

## What's missing — quick wins to add

The Super Admin → Org Detail page should make this obvious instead of making you guess. I'd add:

1. **"Edit this org" button** on `SuperAdminOrgDetail` (next to the existing self-add/view-as buttons) that:
   - If you're a member of this org → navigates to `/org-settings` and ensures the active org context is this one
   - If you're not a member → prompts you to self-add first

2. **Active org switcher** (small) — if a platform admin is a member of >1 org, let them pick which one `useOrganization` returns. Today it's just "first one wins" which is fragile now that admins can join multiple orgs.

3. **Inline note on the org detail page** — small banner: "You are a member of this org as `admin`. [Edit org settings] [Leave org]" so the state is obvious.

## Files

- Edit: `src/pages/SuperAdminOrgDetail.tsx` — add member-state banner + "Edit org settings" button + "Leave org" button (calls existing `admin_self_remove_from_org` RPC)
- Edit: `src/hooks/useOrganization.tsx` — when a user has multiple memberships, prefer one stored in `localStorage` (`fireops_active_org_id`); fall back to first
- Optional: small org switcher in Settings if multi-org membership is detected

## Out of scope (ask if you want)

- A full "switch org" dropdown in the top nav
- Audit log of admin edits to org settings (separate from existing platform_admin_audit)

