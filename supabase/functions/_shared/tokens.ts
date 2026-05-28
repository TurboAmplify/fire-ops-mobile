// Random URL-safe thread tokens
export function newThreadToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Extract reply+<token>@... -> token. Existing tokens are URL-safe
// mixed-case strings, not just hex, so accept alphanumeric plus _/-.
export function parseReplyToken(addr: string): string | null {
  const m = addr.match(/reply\+([a-z0-9_-]{16,96})@/i);
  return m ? m[1] : null;
}
