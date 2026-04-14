/**
 * Returns today's date in YYYY-MM-DD format using the user's local timezone.
 * Avoids the UTC-ahead bug from `new Date().toISOString().split("T")[0]`.
 */
export function getLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}