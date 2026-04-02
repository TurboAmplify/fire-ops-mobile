

## Plan: DocuSign-Style Signature Picker with Audit Trail

### What We're Building
Replace the current draw-only signature canvas with a two-option flow:
1. **Type-to-sign**: User types their name, picks from 3-4 cursive font styles rendered on canvas
2. **Draw your own**: Falls back to current freehand canvas if none of the generated options work

All signatures get logged to a new `signature_audit_log` table with timestamps for compliance.

### Database Change

**New table: `signature_audit_log`**
```sql
CREATE TABLE signature_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_ticket_id uuid NOT NULL,
  organization_id uuid,
  signer_type text NOT NULL,        -- 'contractor' or 'supervisor'
  signer_name text,
  signature_url text NOT NULL,
  method text NOT NULL,             -- 'typed' or 'drawn'
  font_used text,                   -- e.g. 'Dancing Script' (null if drawn)
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_info text,
  user_id uuid
);
ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;
-- RLS policies matching org-based access pattern
```

### Component Changes

**1. New component: `SignaturePicker.tsx`** (replaces `SignatureCanvas` usage)
- Full-screen modal (same pattern as current `SignatureCanvas`)
- **Step 1 — Type name**: Text input at top, auto-generates 3-4 signature previews using Google Fonts cursive families (Dancing Script, Great Vibes, Satisfy, Pacifico) rendered on individual `<canvas>` elements
- Each preview is a tappable card showing the name in that font style
- **Step 2 — Select or Draw**: Tap a generated signature to select it, OR tap "Draw My Own" button to switch to the freehand canvas (reuses existing canvas logic)
- On confirm: renders final signature to PNG blob, calls `onSave` with the blob + metadata (method, font)

**Font loading approach**: Use `document.fonts.load()` with Google Fonts loaded via a `<link>` tag injected on mount. Fonts render to canvas for the PNG output — no external dependency at signature time.

**2. Update `SignatureCanvas.tsx`**
- Keep as-is but export the drawing logic so `SignaturePicker` can embed it in "Draw My Own" mode
- Or simply embed the canvas drawing logic directly in `SignaturePicker` to avoid coupling

**3. Update `ShiftTicketForm.tsx`**
- Replace `<SignatureCanvas>` with `<SignaturePicker>`
- Pass signer name (contractor rep name / supervisor name) as default text
- Update `handleSignatureSave` to accept metadata (method, font) alongside the blob
- After upload, insert a row into `signature_audit_log` with ticket ID, signer type, method, font, timestamp, and user ID

**4. Update `src/services/shift-tickets.ts`**
- Add `insertSignatureAuditLog(entry)` function
- Keep existing `uploadSignature()` unchanged

### Flow (User Perspective)
1. User fills in "Contractor Rep Name" field (e.g. "John Smith")
2. Taps "Tap to sign"
3. Full-screen modal opens with name pre-filled
4. 3-4 cursive renderings of "John Smith" appear as tappable cards
5. User taps one they like → confirm → done
6. OR taps "Draw My Own" → freehand canvas appears → draw → save
7. Signature PNG uploaded to storage, audit log row created with timestamp

### What Stays the Same
- Signature storage bucket and upload logic unchanged
- PDF generation unchanged (still reads signature URL)
- Duplicate flow unchanged (still clears signatures)
- All existing shift ticket save/edit workflows untouched

### Files Changed
| File | Change |
|------|--------|
| `src/components/shift-tickets/SignaturePicker.tsx` | New component |
| `src/components/shift-tickets/ShiftTicketForm.tsx` | Swap SignatureCanvas for SignaturePicker, add audit log call |
| `src/services/shift-tickets.ts` | Add `insertSignatureAuditLog()` |
| Database migration | Create `signature_audit_log` table with RLS |

### Risk Assessment
- **No breaking changes**: Existing signature URLs stay in the same format/bucket
- **Backward compatible**: Old tickets with existing signatures display normally
- **Mobile-first**: Large tap targets for font selection, full-screen modal, works on all screen sizes
- **Fonts**: Google Fonts loaded dynamically, graceful fallback if network is poor (draw option always available)

