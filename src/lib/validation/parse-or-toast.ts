/**
 * validateOrToast — run a Zod schema and surface the first error as a toast.
 *
 * Returns the parsed (typed, sanitized) value on success, or null on failure.
 * Use at the start of any submit handler:
 *
 *   const parsed = validateOrToast(expenseSchema, formState);
 *   if (!parsed) return;
 *   await saveExpense(parsed);
 */
import { toast } from "sonner";
import type { z } from "zod";
import { firstZodMessage } from "./schemas";

export function validateOrToast<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  opts?: { title?: string }
): z.infer<T> | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const message = firstZodMessage(result.error);
  toast.error(opts?.title ?? "Please fix this before saving", {
    description: message,
  });
  return null;
}

/**
 * Same as validateOrToast but returns the full result so the caller can
 * highlight the offending field(s) in the form.
 */
export function validateWithFieldErrors<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; fieldErrors: Record<string, string>; firstMessage: string } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    fieldErrors,
    firstMessage: firstZodMessage(result.error),
  };
}
