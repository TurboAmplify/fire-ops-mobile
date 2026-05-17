/**
 * Local signature cache for offline shift ticket signing.
 *
 * When a user captures a signature while offline we can't upload to Supabase
 * Storage, so we stash the PNG blob in IndexedDB and write a placeholder URL
 * of the form `local-sig://<uuid>` onto the ticket row. At sync time the
 * offline queue swaps the placeholder for the real uploaded URL.
 */
import { get, set, del } from "idb-keyval";

const PREFIX = "fireops-localsig-";
export const LOCAL_SIG_SCHEME = "local-sig://";

/** Save a signature blob locally and return the placeholder URL. */
export async function saveLocalSignature(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await set(PREFIX + id, blob);
  return LOCAL_SIG_SCHEME + id;
}

/** Resolve a local-sig:// URL to its stored blob, or null if missing. */
export async function getLocalSignatureBlob(url: string): Promise<Blob | null> {
  if (!isLocalSignatureUrl(url)) return null;
  const id = url.slice(LOCAL_SIG_SCHEME.length);
  const blob = await get<Blob>(PREFIX + id);
  return blob ?? null;
}

export async function deleteLocalSignature(url: string): Promise<void> {
  if (!isLocalSignatureUrl(url)) return;
  const id = url.slice(LOCAL_SIG_SCHEME.length);
  await del(PREFIX + id);
}

export function isLocalSignatureUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(LOCAL_SIG_SCHEME);
}

/** Cached object URLs so repeated renders don't recreate blob URLs. */
const objectUrlCache = new Map<string, string>();

/**
 * Resolve a local-sig:// URL to an object URL the browser can render.
 * Returns null if the blob isn't found.
 */
export async function getLocalSignatureObjectUrl(url: string): Promise<string | null> {
  const cached = objectUrlCache.get(url);
  if (cached) return cached;
  const blob = await getLocalSignatureBlob(url);
  if (!blob) return null;
  const objUrl = URL.createObjectURL(blob);
  objectUrlCache.set(url, objUrl);
  return objUrl;
}
