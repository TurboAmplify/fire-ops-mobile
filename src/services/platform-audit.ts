import { supabase } from "@/integrations/supabase/client";

export interface PlatformAuditEntry {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  reason: string | null;
}

/** Append an entry to the platform admin audit log. Caller must be a platform admin. */
export async function logPlatformAction(
  action: string,
  opts: {
    targetType?: string;
    targetId?: string;
    payload?: Record<string, unknown>;
    reason?: string;
  } = {},
): Promise<string | null> {
  const { data, error } = await supabase.rpc("admin_log_action", {
    _action: action,
    _target_type: opts.targetType ?? null,
    _target_id: opts.targetId ?? null,
    _payload: (opts.payload ?? {}) as never,
    _reason: opts.reason ?? null,
  });
  if (error) {
    console.error("admin_log_action failed:", error.message);
    return null;
  }
  return (data as unknown as string) ?? null;
}

/** List recent platform admin audit entries. Caller must be a platform admin. */
export async function listPlatformAudit(limit = 100): Promise<PlatformAuditEntry[]> {
  const { data, error } = await supabase.rpc("admin_list_audit", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as unknown as PlatformAuditEntry[];
}
