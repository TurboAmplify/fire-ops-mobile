/**
 * Input sanitization helpers.
 *
 * Used at the form layer to normalize user input BEFORE Zod validation:
 *  - strip ASCII control chars (except \n, \r, \t)
 *  - normalize Unicode (NFC)
 *  - collapse runs of whitespace in single-line fields
 *  - hard-cap length so a paste of 1MB never reaches the network
 *
 * These run on every keystroke for capped fields and at submit time
 * for everything else. They never throw.
 */

export const TEXT_CAPS = {
  /** Short identifier-ish field: name, plate, VIN, codes */
  short: 100,
  /** Single-line label / address line / vendor */
  medium: 255,
  /** Multi-line note / remarks / description */
  long: 5_000,
  /** Free-form long-form text (rare) */
  xlong: 20_000,
} as const;

export type TextCap = keyof typeof TEXT_CAPS;

/** Strip ASCII control chars except newline/carriage-return/tab. */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Normalize Unicode to NFC so visually-equal strings compare equal. */
export function normalizeUnicode(input: string): string {
  try {
    return input.normalize("NFC");
  } catch {
    return input;
  }
}

/** Trim + collapse internal whitespace runs to a single space. */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize a single-line text input (name, vendor, plate, etc.).
 * Strips control chars, normalizes, collapses whitespace, caps length.
 */
export function sanitizeSingleLine(
  input: string | null | undefined,
  cap: TextCap = "medium"
): string {
  if (input == null) return "";
  let s = String(input);
  s = stripControlChars(s);
  s = normalizeUnicode(s);
  s = collapseWhitespace(s);
  return s.slice(0, TEXT_CAPS[cap]);
}

/**
 * Sanitize a multi-line text input (notes, remarks).
 * Preserves newlines but strips other control chars and caps length.
 */
export function sanitizeMultiLine(
  input: string | null | undefined,
  cap: TextCap = "long"
): string {
  if (input == null) return "";
  let s = String(input);
  s = stripControlChars(s);
  s = normalizeUnicode(s);
  // Normalize CRLF -> LF, trim trailing whitespace per line
  s = s.replace(/\r\n?/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  // Limit consecutive blank lines to 2
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();
  return s.slice(0, TEXT_CAPS[cap]);
}

/** Sanitize a phone number: keep digits, +, space, -, (, ), . */
export function sanitizePhone(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[^\d+\-()\s.]/g, "").slice(0, 32);
}

/** Sanitize an email: trim, lowercase, strip whitespace. */
export function sanitizeEmail(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).trim().toLowerCase().replace(/\s+/g, "").slice(0, 255);
}

/** Sanitize a numeric string, keeping digits + at most one decimal. */
export function sanitizeDecimal(input: string | null | undefined): string {
  if (input == null) return "";
  let s = String(input).replace(/[^\d.\-]/g, "");
  // Keep only the first decimal point
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  // Minus sign only allowed at position 0
  if (s.includes("-")) {
    const neg = s.startsWith("-");
    s = (neg ? "-" : "") + s.replace(/-/g, "");
  }
  return s.slice(0, 20);
}
