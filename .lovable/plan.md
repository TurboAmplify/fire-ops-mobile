

# Add Second User to Existing Organization

## What is already in place
The app has a complete invite flow:
- **OrgSettings page**: Owner can send invites (email + role)
- **OrgSetup page**: On login, checks for pending invites matching the user's email and offers to accept

## Steps (no code changes required)

1. **Send the invite first**: Log in as `baldrich2025gt@gmail.com`, go to Settings > Organization, tap "Invite Team Member", enter `daldrich75@yahoo.com` with role **Owner**
2. **Sign up the new account**: Go to the login page, sign up with `daldrich75@yahoo.com` / `Bigjake2020!!`
3. **Accept the invite**: The new user will land on the Org Setup screen, which will detect the pending invite and show a "Join [org name]" option
4. **Done**: Both accounts now share the same organization and see all the same incidents, crew, trucks, expenses, and shift tickets

## Fallback
If something goes wrong with the invite flow, I can directly insert the new user into your organization via a database command after they sign up.

## Recommendation
Start with Step 1 -- send the invite now from your existing account. Then sign up with the new email. Let me know if you hit any issues and I will handle it.

