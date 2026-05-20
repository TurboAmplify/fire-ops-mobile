# Shift Ticket + Demob + OF-286 + Threaded Messaging — Final Plan

## Goal
Bulletproof, mostly-automated email workflow with human-in-the-loop review and reply. Inbound AI classifies OF-286 drafts, surfaces them for review/approve, and lets users sign on-device. Mobile-first, Apple-ready, Despia-compatible.

---

## Locked Decisions (from your answers)

1. **Resend** — Lovable-managed connector.
2. **Domain** — `mail.fireopshq.com` (already verified for send + receive on the marketing project). Per-org From: `<handle>@mail.fireopshq.com`. Reply-To carries thread token: `reply+<token>@mail.fireopshq.com`.
3. **Finance directory** — fully shared across all orgs day one, **organized by region**. Default view = officers matched to the incident's GACC region (from resource order). "Show all regions" toggle available but secondary.
4. **Phase A now** (in-app messaging + email). **Phase B later** (native APNs → new Despia build + Apple review).
5. **OF-286 Approve reply** — auto-prefilled editable draft (user can send as-is or tweak).
6. **Reply templates** — seed defaults per purpose, editable in Org Settings.

---

## ⚠️ Despia / Apple Review

| Capability | Rebuild? | Apple Review? |
|---|---|---|
| Everything in Phase A (Resend, AI classify, OF-286 sign, messaging, demob) | ❌ | ❌ |
| Phase B native APNs push | ✅ | ✅ |

---

## 1. AI Inbound Classification (NEW — this was the gap)

When the `incoming-email` webhook fires:

1. Resolve thread from `reply+<token>` (or fuzzy match by sender + recent outbound).
2. For each PDF attachment, run a 2-pass AI classification via Lovable AI Gateway (`google/gemini-3-flash-preview`):
   - **Pass 1 — Document type:** OF-286 / OF-297 (shift ticket) / demob doc / other. Uses first-page text + filename.
   - **Pass 2 (if OF-286) — Stage:** `of286_draft_received` (unsigned by finance) vs `of286_finance_signed` (finance signature present). Detects signature block fill, "Approved by" stamp, finance signer name.
3. Confidence threshold ≥ 0.80 → auto-attach to `incident_documents` at correct stage, link to `incident_truck`, set `awaiting_action_by_user_id`, fire `app_notifications` ("OF-286 ready for your review").
4. Confidence < 0.80 → message lands in thread as a plain reply with a yellow "We think this is an OF-286 — confirm?" chip; user one-taps to accept the classification or pick the correct type/stage manually.
5. Every classification logged to `incident_document_audit` with `event_type='auto_classified'`, the AI confidence, and the model version (so we can audit/retrain).

**Fallback always available:** even if AI fails completely, the PDF still appears as a normal attachment in the thread and the user can tap "Attach to OF-286" to file it manually. Zero data loss path.

---

## 2. OF-286 Review → Approve → Sign Workflow (NEW detail)

State machine on `incident_documents.stage`:
```
original
  → contractor_signed (existing)
  → of286_draft_received   ← AI-classified inbound
       → of286_draft_approved          (Approve button)
       → of286_changes_requested       (Request Changes button)
       → of286_pending_user_signature  (Finance sent back for signature)
            → finance_signed           (final, after user signs and auto-sends)
```

### Review screen (`/incident/:id/of286/:docId/review`)
- Full-screen PDF viewer (existing `useSignedUrl` + pdf rendering), portrait-locked, pinch-zoom, page nav.
- Sticky bottom action bar:
  - **Approve** → opens pre-filled editable email draft ("Reviewed and approved — please send back for signature.") → Send → status = `of286_draft_approved`.
  - **Request Changes** → opens pre-filled draft with bullet list placeholder, user fills in → Send → status = `of286_changes_requested`.
  - **Sign now** (caveat shortcut for "first round needs signature") → skips Approve, goes to signature capture.
- Side panel: who sent it, when, AI confidence chip, "Wrong classification?" reclassify link.

### Signature capture
- Reuses existing `SignaturePicker` + `SignatureCanvas` (already used on shift tickets and current OF-286 flow).
- Reuses `src/lib/pdf-sign.ts` (`stampSignatureOntoPdf`) to burn the signature, signer name, and timestamp onto the OF-286 PDF.
- Saves stamped PDF as new `incident_documents` row, stage = `contractor_signed` (for round 2) or directly attached to `of286_pending_user_signature`'s reply.
- Auto-composes reply to the same thread with the signed PDF attached and pre-filled body ("Signed and returned — see attached."), user reviews + sends.
- On send → stage advances to `finance_signed` automatically when finance returns the next round, OR user can mark complete manually.

### OF-286 form standard
OF-286 is a U.S. government standard form (Emergency Equipment Use Invoice) — signature block is consistent: bottom of last page, contractor signature on the left, government rep on the right. Our existing `stampSignatureOntoPdf` already targets the last page; we'll add coordinate presets for OF-286's contractor block. **No need for you to attach a sample** — the form layout is fixed and well-documented. If we find variants (e.g., new revision year), we'll add a coordinate override per detected version.

---

## 3. Email Infrastructure (Resend, Lovable-managed)

- Connect Resend via `standard_connectors--connect` (connector_id: `resend`). Uses Lovable's connector gateway — no manual API key.
- Domain `mail.fireopshq.com` already verified on the FireOps HQ Marketing project — we'll reuse the same Resend account. Confirm domain is shared (or add this project as a second app under the same Resend workspace).
- Per-org sender: `<organizations.email_handle>@mail.fireopshq.com`. Handle validated `^[a-z0-9][a-z0-9-]{2,30}$`, unique, 1 change / 30 days, set during onboarding (suggested from org name).
- Reply-To always `reply+<thread_token>@mail.fireopshq.com` so inbound routing is bulletproof.
- Inbound webhook → `incoming-email` edge function (HMAC-verified, sanitizes HTML, stores attachments, runs AI classify, creates notifications).

---

## 4. Finance Officer Directory (region-organized)

- `gacc_regions` seeded with 10 canonical GACC regions.
- `finance_officers` (cross-tenant): name, email, phone, dispatch_office, `region_id` FK, agency, notes, is_active, verified_at, last_used_at, use_count, created_by_user_id/org_id. RLS: any user SELECT + INSERT, original org admins + platform admins UPDATE/DELETE. Audit table `finance_officer_audit`.
- `incidents.region_id` — populated from resource order parse (existing `parse-resource-order` edge function will be extended to extract incident region/GACC). Manual dropdown override.
- **Region-first picker UX:** when adding a finance contact to an incident_truck, default list = `finance_officers WHERE region_id = incidents.region_id` sorted by `verified_at DESC, use_count DESC`. Below: "Show all regions" toggle, "Add new officer" CTA, "One-off contact" CTA (saves only to link table).
- `incident_truck_finance_contacts` link table — multi-contact, role per contact (`shift_tickets` | `demob` | `both`), overrides for name/email/phone if a one-off.

---

## 5. Threaded Messaging UI (per-incident, with global Inbox)

- **`communication_threads`** — one per (incident_truck, contact, purpose: `shift_ticket` | `demob` | `of286` | `general`). Has `thread_token`, `unread_count_for_org`, `status`, `participants[]`.
- **`messages`** — out/in, `body_html_sanitized` (DOMPurify), `resend_message_id`, `in_reply_to`, `references[]`, `read_at`, `read_by_user_id`.
- **`message_attachments`** — file + `auto_classified_as` + AI confidence.
- **`message_drafts`** — per-user autosave, survives app restart, offline-safe.

### UI surfaces
- **Per-truck Messages tab** — chat-style threads grouped by purpose, with system message chips for state changes ("OF-286 draft auto-attached", "Approved and sent for signature", "Signed and returned").
- **Global Inbox** (behind notification bell) — flat list of threads with unread, scoped to incidents the user can access. NOT a general inbox.
- **Reply composer** — autosaving textarea, quick-reply chips per purpose, template picker (from Org Settings), attachment picker (camera roll, files, "attach existing incident doc"), offline queue.
- **Read state** — opening a thread clears unread for the whole org.
- **Image safety** — remote images stripped by default, per-message "Load images" tap (prevents tracking pixels).

---

## 6. Demob Packets (unchanged from prior plan)

`demob_packets` + `demob_packet_pages` with full-screen Capacitor Camera capture, page reorder, methods: `email` (combines pages → PDF → Resend in same thread), `online`, `in_person`. Offline-safe via existing queue.

---

## 7. Notifications

- **Phase A:** `app_notifications` table + Supabase realtime + bell badge. Types: `message_received`, `of286_received`, `of286_signature_needed`, `of286_signed`, `finance_replied`, `demob_acknowledged`. Optional email-to-self for `of286_signature_needed` so users in the field don't miss it.
- **Phase B (later):** Capacitor Push + APNs → new Despia build + Apple resubmission. Same `app_notifications` table powers it.

---

## 8. Reply Template Seeds (Org Settings → editable)

Seeded per purpose; each org's admin can edit in Settings:
- **Shift ticket cover** — "Attached is shift ticket #{ticket_number} for {date}. Please review and let us know if anything needs attention."
- **OF-286 approve** — "Reviewed and approved — please send back for our signature. Thanks."
- **OF-286 request changes** — "Please revise the following before we sign: \n- [item 1]\n- [item 2]"
- **OF-286 signed return** — "Signed and returned — see attached. Thanks for your help closing this out."
- **Demob cover** — "Attached is the demob packet for {truck_name}. Please confirm receipt."
- **General quick replies** — "Received, thanks." / "Will review and get back to you." / "Please resend latest version."

---

## 9. Build & Migration Order

1. Connect Resend connector (Lovable-managed); confirm `mail.fireopshq.com` reachable from this project.
2. `gacc_regions` (seed 10), `finance_officers` + audit + RLS + indexes.
3. `organizations.email_handle` + validation + onboarding step.
4. `incidents.region_id` + extend `parse-resource-order` to extract region.
5. `incident_truck_finance_contacts`.
6. `communication_threads`, `messages`, `message_attachments`, `message_drafts` + `communication-attachments` bucket.
7. `demob_packets`, `demob_packet_pages` + `demob-packets` bucket.
8. Extend `incident_documents` stages + `incident_document_audit` event types.
9. `app_notifications` + realtime publication.
10. `org_reply_templates` (per-org overrides; falls back to seed).
11. Edge functions: `send-shift-ticket-email`, `send-demob-packet`, `send-of286-response`, `send-thread-reply`, `incoming-email` (with AI classify), `classify-inbound-attachment` (helper).
12. UI: Finance contact picker, Send-shift-ticket dialog, Demob builder, OF-286 review/sign screen, Messages tab, Thread view, Reply composer, Global Inbox, Notification bell, Org Settings (email handle + reply templates).
13. Ship Phase A.
14. *(Later)* Capacitor Push + Despia rebuild + Apple resubmission.

---

## 10. Safety / Bulletproofing

- All inbound HTML sanitized server-side AND on render.
- Reply tokens: random 128-bit, single-thread, never reused.
- AI classification has a confirm step under threshold; manual reclassify always available; full audit trail with model version + confidence.
- Outbound rate-limited (200/day/org, 20/min/user). Resend handles bounces → `suppressed_emails`.
- All edits to existing files surgical: `ShiftTicketForm.tsx`, `IncidentTruckDetail.tsx`, `IncidentForm.tsx`, `OrgSettings.tsx`, `OF286UploadCard.tsx`. Zero changes to auth, ProtectedRoute, useOrganization, tutorial, or any business logic outside this feature.
- Every new table additive + nullable on existing FKs → zero risk to current data.

---

Ready to build on approval. After you approve, I'll start with Resend connector + migration 1–4 (foundation) so you can see the finance directory + region matching working before we wire up the email pipeline.
