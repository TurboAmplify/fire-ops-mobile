import { get, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUEUE_KEY = "fireops-offline-queue";
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours

export interface QueuedMutation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  /** For update/delete — the row id */
  rowId?: string;
  timestamp: number;
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const queue = await get(QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  await set(QUEUE_KEY, queue.filter((m) => m.id !== id));
}

async function replayMutation(m: QueuedMutation): Promise<boolean> {
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
    return true;
  } catch (err) {
    console.error("Failed to replay mutation:", m, err);
    return false;
  }
}

export async function replayQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  // Remove expired mutations
  const now = Date.now();
  const valid = queue.filter((m) => now - m.timestamp < MAX_AGE_MS);
  const expired = queue.length - valid.length;
  if (expired > 0) {
    console.log(`Removed ${expired} expired offline mutations`);
  }

  let synced = 0;
  for (const mutation of valid) {
    const success = await replayMutation(mutation);
    if (success) {
      await removeFromQueue(mutation.id);
      synced++;
    } else {
      // Stop on first failure to maintain order
      break;
    }
  }

  if (synced > 0) {
    toast.success(`Synced ${synced} pending change${synced > 1 ? "s" : ""}`);
  }

  return synced;
}

// Auto-replay on reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Small delay to let connection stabilize
    setTimeout(() => {
      replayQueue();
    }, 2000);
  });
}
