/**
 * PHASE 2 — DO NOT USE.
 *
 * This file previously implemented an offline write queue + replay loop.
 * It is intentionally disabled because the queue requires a sync engine
 * and conflict resolution that have NOT been built yet.
 *
 * Enabling silent queueing without sync = silent data loss in the field.
 *
 * For now, every mutation must call `assertOnlineForWrite()` from
 * `src/lib/offline-guard.ts`. When offline, writes are blocked and the
 * user gets a clear toast.
 *
 * When Phase 2 is built, restore this file from git history and add the
 * sync engine, conflict resolution, and the failed-mutations review UI
 * before wiring it back into any hook.
 */

export class OfflineQueuedError extends Error {
  readonly isOfflineQueued = true;
  constructor(message = "Mutation queued for offline sync") {
    super(message);
    this.name = "OfflineQueuedError";
  }
}

export function useOfflineMutation(): never {
  throw new Error(
    "useOfflineMutation is disabled. The offline write queue is a Phase 2 feature " +
      "that requires a sync engine. Use a normal useMutation with assertOnlineForWrite() instead."
  );
}
