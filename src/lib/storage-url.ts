import { supabase } from "@/integrations/supabase/client";

/**
 * Storage URL helper for private buckets.
 *
 * Files are stored in private buckets and accessed via short-lived signed URLs.
 * To avoid migrating every column that holds a file URL, we keep storing
 * the "public" form of the URL (which still parses cleanly), and at render
 * time we extract the {bucket, path} and request a signed URL.
 *
 * Signed URLs are cached in-memory until shortly before they expire to avoid
 * hammering the storage API on every render.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const SIGNED_URL_REFRESH_BEFORE_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/** Recognised bucket names. Anything else falls through unchanged. */
const KNOWN_BUCKETS = new Set([
  "receipts",
  "agreements",
  "resource-orders",
  "truck-photos",
  "truck-documents",
  "crew-photos",
  "signatures",
  "inspection-photos",
  "incident-documents",
]);

/**
 * Parse a stored URL and pull out the bucket and object path.
 * Handles both legacy public-form URLs (`/storage/v1/object/public/<bucket>/<path>`)
 * and signed-form URLs (`/storage/v1/object/sign/<bucket>/<path>?token=...`).
 *
 * Returns null if the URL is not a Supabase Storage URL we recognise
 * (e.g. blob: previews, external URLs).
 */
export function parseStorageUrl(
  url: string | null | undefined,
): { bucket: string; path: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    // Expected: storage / v1 / object / (public|sign|authenticated) / <bucket> / <...path>
    const objectIdx = segments.indexOf("object");
    if (objectIdx === -1 || segments.length < objectIdx + 3) return null;
    const kind = segments[objectIdx + 1];
    if (!["public", "sign", "authenticated"].includes(kind)) return null;
    const bucket = segments[objectIdx + 2];
    if (!KNOWN_BUCKETS.has(bucket)) return null;
    const path = segments
      .slice(objectIdx + 3)
      .map((s) => decodeURIComponent(s))
      .join("/");
    if (!path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

/**
 * Get a short-lived signed URL for a stored file URL.
 * - Returns the original URL untouched if it's not a known storage URL
 *   (blob: previews, external URLs, etc).
 * - Returns null if signing fails (e.g. the file no longer exists or the
 *   user lacks permission).
 * - Cached per-URL until shortly before the signed URL expires.
 */
export async function getViewableUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;

  const parsed = parseStorageUrl(url);
  if (!parsed) return url; // pass through blob:, external, etc.

  const cacheKey = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt - SIGNED_URL_REFRESH_BEFORE_MS > now) {
    return cached.url;
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.warn("Failed to sign storage URL:", parsed.bucket, parsed.path, error?.message);
      return null;
    }
    cache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
    });
    return data.signedUrl;
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}

/** Clear the in-memory signed-URL cache (e.g. on sign-out). */
export function clearSignedUrlCache() {
  cache.clear();
}
