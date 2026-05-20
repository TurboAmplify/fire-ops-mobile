// Random URL-safe thread tokens
export function newThreadToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Extract reply+<token>@... -> token
export function parseReplyToken(addr: string): string | null {
  const m = addr.match(/reply\+([a-f0-9]{16,64})@/i);
  return m ? m[1].toLowerCase() : null;
}
