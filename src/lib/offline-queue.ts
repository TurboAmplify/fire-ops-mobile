import { get, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUEUE_KEY = "fireops-offline-queue";
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours
const MAX_ATTEMPTS = 5;

export interface QueuedMutation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  /** For update/delete — the row id */
  rowId?: string;
  timestamp: number;
  /** How many replay attempts have failed for this mutation */
  attempts?: number;
  /** Last error message, if any */
  lastError?: string;
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const queue = await get(QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  await set(QUEUE_KEY, queue);
  notifyChanged();
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    attempts: 0,
  });
  await writeQueue(queue);
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function getFailedMutations(): Promise<QueuedMutation[]> {
  const queue = await getQueue();
  return queue.filter((m) => (m.attempts ?? 0) >= MAX_ATTEMPTS);
}

export async function discardMutation(id: string): Promise<void> {
  const queue = await getQueue();
  await writeQueue(queue.filter((m) => m.id !== id));
}

export async function discardAllFailed(): Promise<number> {
  const queue = await getQueue();
  const remaining = queue.filter((m) => (m.attempts ?? 0) < MAX_ATTEMPTS);
  const removed = queue.length - remaining.length;
  if (removed > 0) await writeQueue(remaining);
  return removed;
}

async function replayMutation(m: QueuedMutation): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (m.operation === "insert") {
      const { error } = await supabase.from(m.table as any).insert(m.payload as any);
      if (error) throw error;
    } else if (m.operation === "update" && m.rowId) {
      const { error } = await supabase.from(m.table as any).update(m.payload as any).eq("id", m.rowId);
      if (error) throw error;
    } else if (m.operation === "delete" && m.rowId) {
      const { error } = await supabase.from(m.table as any).delete().eq("id", m.rowId);
      if (error) throw error;
    }
    return { ok: true };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("Failed to replay mutation:", m, err);
    return { ok: false, error: message };
  }
}

let replayInFlight: Promise<number> | null = null;

export async function replayQueue(): Promise<number> {
  // Avoid concurrent replay loops
  if (replayInFlight) return replayInFlight;
  replayInFlight = (async () => {
    try {
      let queue = await getQueue();
      if (queue.length === 0) return 0;

      // Drop expired mutations
      const now = Date.now();
      const fresh = queue.filter((m) => now - m.timestamp < MAX_AGE_MS);
      const expired = queue.length - fresh.length;
      if (expired > 0) {
        queue = fresh;
        await writeQueue(queue);
      }

      let synced = 0;
      let newlyFailed = 0;

      // Iterate over a snapshot; rewrite the queue at the end with updates
      for (const mutation of [...queue]) {
        const attempts = mutation.attempts ?? 0;
        if (attempts >= MAX_ATTEMPTS) continue; // already in failed state — skip

        const result = await replayMutation(mutation);

        // Refresh the queue from disk in case other writes happened
        queue = await getQueue();
        const idx = queue.findIndex((m) => m.id === mutation.id);
        if (idx === -1) continue;

        if (result.ok === true) {
          queue.splice(idx, 1);
          synced++;
        } else {
          const next = (queue[idx].attempts ?? 0) + 1;
          queue[idx] = { ...queue[idx], attempts: next, lastError: (result as { ok: false; error: string }).error };
          if (next >= MAX_ATTEMPTS) newlyFailed++;
        }
        await writeQueue(queue);
      }

      if (synced > 0) {
        toast.success(`Synced ${synced} pending change${synced > 1 ? "s" : ""}`);
      }
      if (newlyFailed > 0) {
        toast.error(
          `${newlyFailed} change${newlyFailed > 1 ? "s" : ""} could not be saved. Open Settings → Sync issues to review.`
        );
      }

      return synced;
    } finally {
      replayInFlight = null;
    }
  })();
  return replayInFlight;
}

// Cross-component change notification (useful for badges/banners)
function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  }
}

// Auto-replay on reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setTimeout(() => {
      replayQueue();
    }, 2000);
  });
}
