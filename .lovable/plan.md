## Problem

Les couldn't add a finance officer's email this morning (very likely on the new **Willow** incident, which is the only recent incident with zero finance contacts). Nothing was written to the database and nothing was logged: no `error_logs` rows, no Postgres errors. So the failure happened client-side, before the network request — a validation toast, a silent state issue, or a duplicate-email collision that surfaced as an unhelpful message. Today the Add Finance Contact dialog swallows most of that context.

## Fix

Two things in the same pass: make the dialog forgiving enough that Les gets through, and make any remaining failure loud enough that we can see it next time.

### 1. Per-field validation instead of one generic toast

`FinanceOfficerPicker` currently blocks with a single toast when name **or** email is missing on the New Officer / One-off tabs. Replace with:
- Inline red field errors under the specific empty/invalid input.
- Email format check (basic regex, matches the DB CHECK constraint) with a clear message.
- Trim whitespace before validating so trailing spaces don't fail.
- Keep the Save button enabled (mobile users hate disabled buttons); surface errors on click.

### 2. Handle duplicate emails gracefully

The `finance_officers` table has `UNIQUE (lower(email)) WHERE is_active`. Right now a duplicate insert throws a raw Postgres error into a toast. Change `handleCreateNew` to:
- Before insert, look up any existing active officer with that email (case-insensitive).
- If found, show a small inline card: "**{Name}** already exists in the directory ({email}). Add them to this incident?" with an Add button that attaches the existing officer via `addContact({ finance_officer_id })`.
- Only insert a new row if nothing matches.

### 3. Preserve typed values across tabs

Users often start typing on Directory search, get no match, then click "New officer" and re-type everything. Seed the New Officer name from the current search string when switching tabs. Keep form state when the user flips back and forth (don't reset on tab change).

### 4. Region select safety

The Region `<Select>` in New Officer uses `form.region_id` (empty string default). Give it a `"none"` placeholder item so it never renders with an invalid value, and map `"none"` → `null` on save.

### 5. Log every failure to `error_logs`

Wrap all three mutation paths in the picker (`handlePick`, `handleCreateNew`, `handleOneOff`) so any thrown error is:
- Toasted with the actual error message (not the generic fallback).
- Written to `error_logs` with route `/incidents/:id`, message = error string, stack, plus a tag like `finance-contact-add` in the message prefix so we can find it.

Use the existing `logError` helper if there is one under `src/lib/error-tracking.ts`; otherwise inline a small insert into `error_logs` (it already has an authenticated INSERT policy).

### 6. Also cover the reactivate path

`addTruckFinanceContact` / `addIncidentFinanceContact` use `.maybeSingle()` on the "already attached?" lookup. If two inactive rows exist for the same finance_officer_id on one incident (legacy dupes), `.maybeSingle()` throws with a very confusing "multiple rows" error. Switch to `.select().limit(1).order("selected_at", desc)` and pick the first, then reactivate that row.

## Technical notes

Files touched — frontend only, no schema change:

- `src/components/incidents/FinanceOfficerPicker.tsx` — per-field validation, duplicate-email lookup + reuse, cross-tab state preservation, Region "none" option, error logging on all three save paths.
- `src/services/incident-truck-finance-contacts.ts` — replace `.maybeSingle()` in `addTruckFinanceContact` / `addIncidentFinanceContact` with a single-row ordered fetch so multiple inactive rows don't throw.
- `src/lib/error-tracking.ts` — if it doesn't already export a `logError({ message, route })`, add a thin helper that inserts into `error_logs`. Otherwise reuse it.

Non-goals:

- No changes to the Send Shift Ticket dialog itself.
- No changes to `finance_officers` schema or RLS.
- Not adding contacts to Willow automatically — Les still picks the right officer once he's unblocked.

## Verification

- Build passes.
- Manually re-trace on Willow: open Overview → Finance Contacts → Add → New officer, submit with just an email → see inline "Name required" under the name field, no toast churn.
- Submit an email that already exists in the directory → see the "already exists, add them?" card and the officer attaches on click.
- Force an error (e.g. malformed email) → row appears in `error_logs` with `finance-contact-add` in the message so we can query it.