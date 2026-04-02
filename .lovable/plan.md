

## Batch Receipt Scanner -- Plan

### What It Does
User takes one photo of multiple receipts laid out together. The AI detects each receipt in the image, extracts data from all of them, and presents a review queue where the user can approve/edit/discard each one before they become draft expenses.

### User Flow
1. On the Expenses page, tap a new "Scan Multiple" button (next to the existing "New" button)
2. Camera opens -- user photographs several receipts laid out on a table
3. Photo uploads to the `receipts` storage bucket
4. A new edge function `parse-batch-receipts` sends the image to Gemini 2.5 Flash with a tool-call schema that returns an **array** of receipts
5. App shows a scrollable review queue -- one card per detected receipt showing amount, date, vendor, category, description
6. Each card has: "Approve" (creates a draft expense), "Edit" (opens pre-filled ExpenseForm), "Discard" (removes from queue)
7. A "Save All" button at the bottom approves all remaining items at once
8. After processing, user returns to the Expenses list with new drafts ready

### Technical Changes

**1. New edge function: `supabase/functions/parse-batch-receipts/index.ts`**
- Accepts `{ imageUrl: string }` (same as existing parse-receipt)
- Uses the same `toDataUrl` helper to convert the image
- Calls Lovable AI with a modified system prompt: "This image may contain MULTIPLE receipts. Identify and extract data from each one separately."
- Tool call schema returns `{ receipts: Array<{ amount, date, category, description, vendor }> }` instead of a single object
- Handles 429/402 errors properly
- Model: `google/gemini-2.5-flash` (same as existing, good at vision tasks)

**2. New service function in `src/services/ai-parsing.ts`**
- Add `parseBatchReceiptsAI(imageUrl: string): Promise<ParsedReceipt[]>`
- Invokes the new edge function and returns the array

**3. New page: `src/pages/BatchReceiptScan.tsx`**
- Photo capture via `<input type="file" accept="image/*" capture="environment">`
- Upload to `receipts` bucket using existing `uploadReceipt()`
- Call `parseBatchReceiptsAI()` with the uploaded URL
- Render a review queue with cards for each detected receipt
- Each card: approve (calls `createExpense` as draft), edit (navigates to `/expenses/new` with pre-filled state), discard
- "Save All" button batch-creates all approved items
- Loading state with progress indicator during AI analysis
- Mobile-first layout: stacked cards, large touch targets, sticky action bar above BottomNav

**4. Route registration in `src/App.tsx`**
- Add `/expenses/batch-scan` route

**5. Entry point on Expenses page (`src/pages/Expenses.tsx`)**
- Add a "Scan Multiple" button in the header area or as a secondary action below the "New" button

### What Won't Change
- Existing single-receipt flow (ExpenseForm + ReceiptParseButton) stays untouched
- All existing expense CRUD, review queue, and status workflows remain as-is
- No database schema changes needed -- uses existing `expenses` table
- No changes to RLS policies

### Mobile / App Store Compliance
- Camera input uses platform-neutral `<input type="file">` (no Capacitor-specific API)
- All touch targets 44px+
- No hover-only interactions
- Sticky action bar positioned above BottomNav with safe area insets
- Loading states and error handling for all async operations

