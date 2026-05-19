import { toast } from "sonner";

/**
 * Phase 0 Offline Guardrails
 *
 * The app does NOT yet queue writes while offline (that is Phase 2). Until
 * then, any mutation that would write to Supabase must short-circuit when
 * the device is offline so the user gets a clear, consistent message instead
 * of a raw network error or a silent failure.
 *
 * Usage in a React Query mutation hook:
 *   mutationFn: (input) => {
 *     assertOnlineForWrite();
 *     return createIncident(input);
 *   }
 *
 * Usage in a form's catch block (or onError):
 *   try { await mutation.mutateAsync(...) } catch (e) { handleMutationError(e) }
 */

export class OfflineWriteBlockedError extends Error {
  readonly isOfflineWriteBlocked = true;
  constructor(message = "You're offline. Reconnect to save changes.") {
    super(message);
    this.name = "OfflineWriteBlockedError";
  }
}

/** True when the browser reports it currently has network connectivity. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Previously threw immediately when navigator.onLine === false. That signal
 * is unreliable inside iOS WebView / Capacitor wrappers (often reports false
 * on a working connection), which was causing real saves — like shift
 * tickets — to fail with a fake "offline" error.
 *
 * We now let the write attempt go through. If the network really is down,
 * the fetch will fail and `handleMutationError` / `isLikelyNetworkError`
 * below will surface a clean offline toast.
 */
export function assertOnlineForWrite(_message?: string): void {
  // Intentional no-op. Kept as a function so existing callers don't break.
}

export function isOfflineWriteBlocked(err: unknown): err is OfflineWriteBlockedError {
  return (
    err instanceof OfflineWriteBlockedError ||
    (typeof err === "object" && err !== null && (err as { isOfflineWriteBlocked?: boolean }).isOfflineWriteBlocked === true)
  );
}

/**
 * Detect raw network failures (fetch errors when offline or DNS unreachable).
 * Treated the same as an offline-write block for user messaging.
 */
function isLikelyNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network ?error|networkerror|load failed|fetch failed/i.test(message);
}

/**
 * Standard mutation error handler for forms.
 *
 * - If the error is an offline-write block, shows the friendly offline toast.
 * - Otherwise, shows the provided fallback toast (or a generic one).
 *
 * Returns true if it handled the error as an offline block, false otherwise.
 * Callers can use the return value to decide whether to also navigate, log,
 * or show their own error UI.
 */
export function handleMutationError(err: unknown, fallbackMessage = "Something went wrong. Please try again."): boolean {
  if (isOfflineWriteBlocked(err) || isLikelyNetworkError(err)) {
    toast.error("You're offline", {
      description: "Reconnect to save your changes.",
    });
    return true;
  }
  const message = err instanceof Error ? err.message : fallbackMessage;
  toast.error(fallbackMessage, message !== fallbackMessage ? { description: message } : undefined);
  return false;
}
