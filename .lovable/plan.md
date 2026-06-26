## Reset Les Madsen's password

1. Confirm Les's email on file: `ltmad@gwtc.net` (verified earlier via `admin-lookup-user`).
2. Invoke the existing `admin-provision-user` edge function with:
   - `email`: `ltmad@gwtc.net`
   - `password`: `Temp1234!`
   - This will find his existing auth account and call `updateUserById` to set the new password and ensure email is confirmed (bypasses HIBP).
3. Report back the email + temp password so you can test sign-in yourself at `app.fireopshq.com` → **Sign In** (not Join your team).

No code changes — uses the already-deployed `admin-provision-user` function.