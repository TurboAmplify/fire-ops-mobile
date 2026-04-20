/**
 * Format a phone number for display in a consistent style.
 * - 10 digits: (555) 123-4567
 * - 11 digits starting with 1: +1 (555) 123-4567
 * - 7 digits: 123-4567
 * - Anything else: returns the original string trimmed
 *
 * Non-digit characters in the input are ignored when parsing,
 * so "6053816872", "605-381-6872", and "(605) 381 6872" all
 * normalize to the same display.
 */
export function formatPhone(input?: string | null): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return input.trim();
}
