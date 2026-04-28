/**
 * Reusable Zod schemas for FireOps HQ forms.
 *
 * Design principles:
 *  - Be FORGIVING on input (accept what the field worker types) but
 *    STRICT on what we send to the database.
 *  - Cap every string at a sane max length so a paste/import can't
 *    push 1MB into Postgres.
 *  - Mirror these limits with DB-level CHECK constraints (Step D).
 *  - Never throw inside the schema — surface friendly messages.
 *
 * Usage:
 *   import { expenseAmountSchema, personNameSchema } from "@/lib/validation/schemas";
 *   const result = personNameSchema.safeParse(value);
 */
import { z } from "zod";
import { TEXT_CAPS } from "./sanitize";

// ---------- primitives ----------

export const uuidSchema = z
  .string({ required_error: "Required" })
  .uuid({ message: "Invalid id" });

export const optionalUuidSchema = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

/** Generic safe single-line text with a configurable cap. */
export function shortTextSchema(opts?: { min?: number; max?: number; label?: string }) {
  const min = opts?.min ?? 0;
  const max = opts?.max ?? TEXT_CAPS.short;
  const label = opts?.label ?? "Field";
  let s = z.string().trim();
  if (min > 0) s = s.min(min, { message: `${label} is required` });
  return s.max(max, { message: `${label} must be ${max} characters or fewer` });
}

/** Generic safe multi-line text (notes, remarks). */
export function longTextSchema(opts?: { max?: number; label?: string }) {
  const max = opts?.max ?? TEXT_CAPS.long;
  const label = opts?.label ?? "Field";
  return z
    .string()
    .max(max, { message: `${label} must be ${max} characters or fewer` })
    .transform((v) => v.trim());
}

/** Optional version of shortTextSchema that yields null for blanks. */
export function optionalShortTextSchema(opts?: { max?: number; label?: string }) {
  const max = opts?.max ?? TEXT_CAPS.short;
  const label = opts?.label ?? "Field";
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? "" : String(v).trim()))
    .refine((v) => v.length <= max, {
      message: `${label} must be ${max} characters or fewer`,
    })
    .transform((v) => (v.length === 0 ? null : v));
}

/** Optional multi-line text. */
export function optionalLongTextSchema(opts?: { max?: number; label?: string }) {
  const max = opts?.max ?? TEXT_CAPS.long;
  const label = opts?.label ?? "Field";
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? "" : String(v).trim()))
    .refine((v) => v.length <= max, {
      message: `${label} must be ${max} characters or fewer`,
    })
    .transform((v) => (v.length === 0 ? null : v));
}

// ---------- people / contact ----------

/** Person name. Letters, marks, spaces, hyphens, apostrophes, periods. */
export const personNameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name must be 100 characters or fewer" })
  .refine((v) => /^[\p{L}\p{M}][\p{L}\p{M}\s'.\-]*$/u.test(v), {
    message: "Name contains invalid characters",
  });

export const optionalPersonNameSchema = z
  .union([personNameSchema, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

/**
 * US-friendly phone. Accepts what users type (parens, spaces, dashes, +)
 * but requires 10+ digits. Stored as the raw cleaned string.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(32, { message: "Phone is too long" })
  .refine(
    (v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: "Enter a valid phone number" }
  );

export const optionalPhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : String(v).trim()))
  .refine(
    (v) => {
      if (v.length === 0) return true;
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: "Enter a valid phone number" }
  )
  .transform((v) => (v.length === 0 ? null : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: "Email is required" })
  .max(255, { message: "Email is too long" })
  .email({ message: "Enter a valid email" });

// ---------- money / numbers ----------

/** Currency: positive, max $1,000,000, two decimals. */
export const currencySchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(v)))
  .refine((v) => Number.isFinite(v), { message: "Enter a valid amount" })
  .refine((v) => v >= 0, { message: "Amount cannot be negative" })
  .refine((v) => v <= 1_000_000, { message: "Amount cannot exceed $1,000,000" })
  .transform((v) => Math.round(v * 100) / 100);

/** Strictly positive currency (for expenses). */
export const positiveCurrencySchema = currencySchema.refine((v) => v > 0, {
  message: "Amount must be greater than 0",
});

/** Hours: 0–24, allows quarter-hour increments without forcing them. */
export const hoursSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(v)))
  .refine((v) => Number.isFinite(v), { message: "Enter valid hours" })
  .refine((v) => v >= 0, { message: "Hours cannot be negative" })
  .refine((v) => v <= 24, { message: "Hours cannot exceed 24" })
  .transform((v) => Math.round(v * 100) / 100);

/** Percentage 0–100. */
export const percentSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(v)))
  .refine((v) => Number.isFinite(v), { message: "Enter a valid percent" })
  .refine((v) => v >= 0 && v <= 100, { message: "Must be between 0 and 100" });

/** Acres / mileage / counts: non-negative reasonable upper bound. */
export const nonNegativeNumberSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(v)))
  .refine((v) => Number.isFinite(v), { message: "Enter a valid number" })
  .refine((v) => v >= 0, { message: "Cannot be negative" });

// ---------- dates ----------

/** ISO date string YYYY-MM-DD. */
export const dateSchema = z
  .string({ required_error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use format YYYY-MM-DD" })
  .refine(
    (v) => {
      const d = new Date(v + "T00:00:00");
      return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100;
    },
    { message: "Enter a valid date" }
  );

/** Date that must not be more than 1 day in the future. */
export const pastOrTodayDateSchema = dateSchema.refine(
  (v) => {
    const d = new Date(v + "T00:00:00").getTime();
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    return d <= tomorrow;
  },
  { message: "Date cannot be in the future" }
);

// ---------- vehicle ----------

/**
 * VIN: 17 chars, no I/O/Q. We stay forgiving on older trucks though,
 * so we only enforce length and character set, not the check digit.
 */
export const vinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v.length === 0 || (v.length >= 11 && v.length <= 17), {
    message: "VIN must be 11–17 characters",
  })
  .refine((v) => v.length === 0 || /^[A-HJ-NPR-Z0-9]+$/.test(v), {
    message: "VIN cannot contain I, O, or Q",
  });

export const optionalVinSchema = z
  .union([vinSchema, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

/** US license plate: 1–10 chars, alphanumerics, dashes, spaces. */
export const plateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v.length === 0 || /^[A-Z0-9\- ]{1,10}$/.test(v), {
    message: "Plate must be 1–10 letters/numbers",
  });

export const optionalPlateSchema = z
  .union([plateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

/** Vehicle year: 1900–next year. */
export const vehicleYearSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
  .refine((v) => Number.isInteger(v), { message: "Year must be a whole number" })
  .refine((v) => v >= 1900 && v <= new Date().getFullYear() + 1, {
    message: `Year must be between 1900 and ${new Date().getFullYear() + 1}`,
  });

export const optionalVehicleYearSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  })
  .refine(
    (v) => v == null || (v >= 1900 && v <= new Date().getFullYear() + 1),
    { message: `Year must be between 1900 and ${new Date().getFullYear() + 1}` }
  );

// ---------- handy formatters ----------

/** Pull a single first-error message out of a Zod error for toast display. */
export function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  if (issue.path.length > 0) {
    return `${issue.path.join(".")}: ${issue.message}`;
  }
  return issue.message;
}
