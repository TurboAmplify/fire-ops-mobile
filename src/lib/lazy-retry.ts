import { lazy, type ComponentType } from "react";

/**
 * React.lazy with retry + one-time hard reload.
 *
 * In the packaged mobile app the WebView can hold a stale index.html that
 * points at hashed chunks which no longer exist after a deploy. The dynamic
 * import then rejects and the route silently fails ("nothing happens" when a
 * shortcut is tapped). We retry once after a short delay, then force a single
 * cache-busting reload so the app picks up the current build.
 */
const RELOAD_KEY = "fireops.chunkReloadAt";

function isChunkError(err: unknown) {
  const msg = String((err as Error)?.message ?? err ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkError(err)) throw err;
      // Second attempt — transient network blips are common in the field.
      try {
        await new Promise((r) => setTimeout(r, 600));
        return await factory();
      } catch (err2) {
        // Reload at most once per 60s so we never loop.
        try {
          const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
          if (Date.now() - last > 60_000) {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
          }
        } catch {
          // ignore storage failures
        }
        throw err2;
      }
    }
  });
}
