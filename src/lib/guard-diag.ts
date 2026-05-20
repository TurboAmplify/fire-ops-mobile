/**
 * Lightweight route-guard diagnostics. Logs to console only in preview/dev
 * builds (NODE_ENV !== "production") so we can see exactly which guard
 * decision is firing when the app is mid-loop.
 *
 * Use sparingly — one call per real decision, not per render.
 */
const lastByKey = new Map<string, string>();

export function guardLog(scope: string, decision: string, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (import.meta.env.PROD) return;
  const key = `${scope}`;
  const signature = `${decision}|${JSON.stringify(extra ?? {})}`;
  if (lastByKey.get(key) === signature) return; // dedupe identical consecutive logs
  lastByKey.set(key, signature);
  // eslint-disable-next-line no-console
  console.log(`[guard:${scope}]`, decision, extra ?? "");
}
