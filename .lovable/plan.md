## What’s actually happening

The backend and app are healthy, but the email send is failing because the currently linked Resend account is **Brandon’s Resend (1)** and that account does **not** have `mail.fireopshq.com` verified. Resend rejects the send with 403, then the app reports it as a backend 502.

This is not a frontend loop or loading bug. It is a sender-domain/account mismatch.

## Fix plan

1. **Switch the project back to the Resend connection that owns the verified domain**
   - Disconnect `Brandon’s Resend (1)` from this project.
   - Link `Brandon’s Resend (2)` again.
   - Redeploy the email-sending functions so they pick up the restored connection secret.

2. **Confirm the deployed email functions are using the restored connection**
   - Redeploy:
     - `send-thread-reply`
     - `incoming-email`
   - Check the function response/logs after the next send attempt.

3. **Make the UI stop feeling like it is looping**
   - Update the shift-ticket send dialog so the send button cannot be repeatedly retried while the previous attempt is still resolving.
   - Surface the precise email-domain failure message in a user-friendly way instead of only showing the generic “Could not send shift ticket.”
   - If sending fails after the message record is created, keep the user in control and do not navigate away.

4. **Optional fallback if neither Resend account has the verified domain**
   - Temporarily send from Resend’s testing sender only for diagnostic/test delivery, or
   - Verify `mail.fireopshq.com` on the Resend account you want to keep.

## Technical notes

- Current linked connector: `Brandon’s Resend (1)`.
- Available previous connector: `Brandon’s Resend (2)`.
- The failing code path is `send-thread-reply`, via the shared Resend helper.
- No database migration is required.
- The real permanent fix is for the API key and verified sender domain to belong to the same Resend account.