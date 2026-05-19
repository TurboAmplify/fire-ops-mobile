import { supabase } from "@/integrations/supabase/client";

const APP_VERSION = "1.0.0";
const MAX_MESSAGE_LEN = 1000;
const MAX_STACK_LEN = 4000;
const MAX_PER_MINUTE = 5;

const recentLogs: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  while (recentLogs.length && now - recentLogs[0] > 60_000) {
    recentLogs.shift();
  }
  if (recentLogs.length >= MAX_PER_MINUTE) return true;
  recentLogs.push(now);
  return false;
}

function truncate(s: string | undefined | null, n: number): string | null {
  if (!s) return null;
  return s.length > n ? s.slice(0, n) : s;
}

// Strip obvious PII patterns (emails, long digit sequences) from text
function scrubPII(s: string | null): string | null {
  if (!s) return s;
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b\d{10,}\b/g, "[number]");
}

export interface LogErrorInput {
  message: string;
  stack?: string | null;
  route?: string | null;
  organizationId?: string | null;
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    if (isRateLimited()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      organization_id: input.organizationId ?? null,
      user_id: user?.id ?? null,
      route: truncate(input.route ?? (typeof window !== "undefined" ? window.location.pathname : null), 200),
      message: scrubPII(truncate(input.message, MAX_MESSAGE_LEN)) ?? "Unknown error",
      stack: scrubPII(truncate(input.stack ?? null, MAX_STACK_LEN)),
      app_version: APP_VERSION,
      online: typeof navigator !== "undefined" ? navigator.onLine : null,
      user_agent: typeof navigator !== "undefined" ? truncate(navigator.userAgent, 300) : null,
    };

    await supabase.from("error_logs").insert(payload);
  } catch {
    // Never throw from the logger
  }
}

let installed = false;

function shouldIgnore(message: string, stack?: string | null): boolean {
  const m = (message || "").toLowerCase();
  const s = (stack || "").toLowerCase();
  // Preview-shell strips auth from non-HTML assets; the manifest 401 /
  // "Failed to fetch" that follows is noise, not a real app error.
  if (m.includes("manifest") || s.includes("/manifest.webmanifest")) return true;
  if (m === "failed to fetch" && (s.includes("manifest") || s === "")) return true;
  // Capacitor web shims throw UnimplementedError on the web preview.
  if (m.includes("not implemented on web") || m.includes("unimplementederror")) return true;
  return false;
}

export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const message = event.message || "window.onerror";
    const stack = event.error?.stack ?? null;
    if (shouldIgnore(message, stack)) return;
    void logError({ message, stack });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason?.message ?? "Unhandled promise rejection";
    const stack = reason?.stack ?? null;
    if (shouldIgnore(message, stack)) return;
    void logError({ message, stack });
  });
}
