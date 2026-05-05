// HMAC verification for marketing-site → app calls.
// Marketing site signs: HMAC-SHA256( secret, `${timestamp}.${rawBody}` ) hex.
// Headers required: x-fireops-timestamp, x-fireops-signature.
// Replay window: 5 minutes.

const REPLAY_WINDOW_SECONDS = 300;

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface HmacVerifyResult {
  ok: boolean;
  status?: number;
  error?: string;
  body?: string;
}

/**
 * Verify an incoming HMAC-signed request from the marketing site.
 * Returns the raw request body on success so handlers can JSON.parse it.
 */
export async function verifyHmac(req: Request): Promise<HmacVerifyResult> {
  const secret = Deno.env.get("MARKETING_SITE_HMAC_SECRET");
  if (!secret) {
    return { ok: false, status: 500, error: "Server not configured" };
  }

  const ts = req.headers.get("x-fireops-timestamp");
  const sig = req.headers.get("x-fireops-signature");
  if (!ts || !sig) {
    return { ok: false, status: 401, error: "Missing signature headers" };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, status: 401, error: "Invalid timestamp" };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > REPLAY_WINDOW_SECONDS) {
    return { ok: false, status: 401, error: "Timestamp outside replay window" };
  }

  const body = await req.text();
  const expected = await hmacHex(secret, `${ts}.${body}`);
  if (!timingSafeEqual(expected, sig.toLowerCase())) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  return { ok: true, body };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-fireops-timestamp, x-fireops-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
