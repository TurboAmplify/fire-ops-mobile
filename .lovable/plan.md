## Platform speed

Lovable.dev has been intermittently slow today — that's on the platform side, not your project. Nothing in your code is causing it. I'll keep this plan focused so the build cycle is small.

## What's actually wrong

The "Invoice Factoring → Schedule of Accounts" card already does the right thing under the hood:

- `Generate Schedule of Accounts` builds the PDF, uploads it to the `factoring-documents` bucket, and stores it on `pendingPdf`.
- `Submit to {factor}` calls the `send-factoring-submission` edge function which **emails WideQ the Schedule PDF + every signed OF-286 PDF as attachments** to `settings.factor_contact_email`.

So the send-to-WideQ logic exists — but you can't reach it because:

1. **The inline `<iframe src={signedUrl}>` PDF preview is failing.** Private-bucket signed URLs for PDFs frequently don't render inline in Chrome/Safari/mobile webviews (Content-Disposition + sandboxing). When the iframe is blank, it looks like "the file won't open."
2. **The `Submit to factor` button is rendered *inside* the preview block**, so if the preview never paints you also can't see/click Submit. That's why it feels like there's "no place to send the schedule and final OF-286."
3. Nothing in the UI tells you that Submit = "email WideQ the schedule + the signed OF-286(s)."

## Plan

### 1. Replace the broken iframe preview with a reliable preview row

In `src/components/incidents/FactoringSubmitCard.tsx`, after `Generate Schedule of Accounts` succeeds, show a compact "ready to send" card instead of an iframe:

- File chip: `Schedule-{N}.pdf` + size
- Two side-by-side buttons:
  - `Open Schedule PDF` — opens the signed URL in a new tab (works on iOS/Android/desktop)
  - `Download` — same URL with `?download=Schedule-{N}.pdf`
- Below it, a small list of the OF-286 attachments that will be included, each with its own `Open` link, so you can spot-check the signed OF-286 before sending.

This sidesteps the iframe rendering problem entirely and matches how the rest of the app previews PDFs (Shift Tickets, OF-286).

### 2. Make the Submit action obvious and always reachable

- Promote `Submit to {factor}` to a full-width primary button rendered directly under the preview card (not nested inside it).
- Relabel to: **`Email Schedule + signed OF-286(s) to {factor_contact_name || "WideQ"}`** so it's unambiguous what gets sent and to whom.
- Add a one-line helper under the button:  
  `Sends to {settings.factor_contact_email} from {your sender address}. You'll get a copy in this thread.`
- Keep the existing `Discard preview & re-edit` link.

### 3. Robust signed-URL retrieval for the preview

In `getViewableUrl` callers used for factoring previews, request the signed URL with an explicit filename hint so the browser shows the correct name when opened:

```ts
await supabase.storage
  .from("factoring-documents")
  .createSignedUrl(path, 3600, { download: false });
```

Already default, but I'll also append `&inline=true` / verify the response works in a new tab. If signing returns null we fall back to the `blob:` URL only as a download link (no iframe).

### 4. Tiny UX cleanups (no logic changes)

- When `pendingPdf` is set but `settingsComplete` is false, disable Submit with a tooltip pointing at Organization Settings (currently the warning is shown but the button is still enabled).
- After successful submit, scroll to / highlight the new entry in the "Submitted" list so it's obvious WideQ got it.

## Out of scope

- No changes to `send-factoring-submission` (already emails the schedule + OF-286s correctly).
- No changes to how the Schedule of Accounts PDF is generated.
- No changes to OF-286 signing flow.
- No DB migrations.

## Files touched

- `src/components/incidents/FactoringSubmitCard.tsx` (main edit)
- possibly `src/lib/storage-url.ts` (small helper if needed for inline-hinted signed URLs)

## How to know it's fixed

After this change, on the incident page you'll see:
1. `Generate Schedule of Accounts` → a small "Ready to send" card with `Open Schedule PDF` (opens in new tab so you can verify your last-requested fixes) + a list of the OF-286 attachments.
2. A clear `Email Schedule + signed OF-286(s) to WideQ` button right under it.
3. After clicking it, WideQ receives one email with both PDFs attached, and the submission shows up under "Submitted" with a working `View PDF` link.
