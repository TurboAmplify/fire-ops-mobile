## Swap Resend connection on FireOps HQ

Switch the project from **Brandon's Resend (2)** to **Brandon's Resend (1)** so emails use the correct API key.

### Steps
1. Disconnect `Brandon's Resend (2)` (std_01knzg0enzesgvj0q1sz12d89k) from this project.
2. Connect `Brandon's Resend (1)` (std_01knzezwzhem7vhztsjv0kqc31) — picker pops up, you click it.
3. Redeploy edge functions that send mail so they pick up the new `RESEND_API_KEY`:
   - `send-thread-reply`
   - `incoming-email`
4. Retry the "Send" button on the shift ticket to verify. If it still fails, check `send-thread-reply` logs for the Resend error message.

### Notes
- No code changes — purely a connector swap + redeploy.
- If Resend (1) turns out to also be wrong, we can swap back just as easily.