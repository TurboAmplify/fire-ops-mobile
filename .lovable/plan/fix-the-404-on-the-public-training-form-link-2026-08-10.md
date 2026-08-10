# Fix the 404 on the public training form link

## What's wrong

The link is not broken and the route is not missing from the code. The live site at `app.fireopshq.com` is still serving an older published build: its JavaScript bundle contains no `/training-form` route, so the app falls through to its own "404 Page not found" screen. The server itself returns the app correctly (HTTP 200) — the 404 is coming from the app's router, not hosting.

The backend piece (the public roster/submit function) is already live, since backend changes deploy immediately. Only the frontend publish is stale.

## Fix

1. Run a security scan check, then publish the current frontend so the live site includes the `/training-form` route.
2. After the deploy finishes (about a minute), verify the published bundle actually contains the route and that the form loads and shows the crew dropdown in a plain browser with no login.
3. Report back with the confirmed working link: `https://app.fireopshq.com/training-form`

No code, database, or schema changes — this is a publish-and-verify only.

## Technical notes

- Verified: `GET https://app.fireopshq.com/training-form` returns 200 with `index.html`; the referenced bundle `index-OscC5ykW.js` has zero occurrences of `training-form`.
- Route is registered in `src/App.tsx` outside `ProtectedRoute`, alongside `/privacy` and `/terms`, so no auth gate is involved.
- If the publish is blocked by a security finding, I'll surface the finding instead of retrying repeatedly.
