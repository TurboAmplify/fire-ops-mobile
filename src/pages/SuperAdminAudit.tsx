import { AppShell } from "@/components/AppShell";
import { PlatformAdminGate } from "@/components/PlatformAdminGate";
import { useQuery } from "@tanstack/react-query";
import { listPlatformAudit, type PlatformAuditEntry } from "@/services/platform-audit";
import { ScrollText } from "lucide-react";

export default function SuperAdminAudit() {
  return (
    <PlatformAdminGate>
      <AppShell title="Audit Log" showBack>
        <AuditList />
      </AppShell>
    </PlatformAdminGate>
  );
}

function AuditList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-audit"],
    queryFn: () => listPlatformAudit(200),
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-2xl bg-card p-4 text-center">
          <p className="text-sm text-destructive font-medium">Couldn't load audit log.</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-2xl bg-card p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 mx-auto mb-3">
            <ScrollText className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-semibold">No audit entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Platform admin actions will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {entries.map((e) => (
        <AuditRow key={e.id} entry={e} />
      ))}
    </div>
  );
}

function AuditRow({ entry }: { entry: PlatformAuditEntry }) {
  const when = new Date(entry.occurred_at);
  const whenStr = when.toLocaleString();
  const target = entry.target_type
    ? `${entry.target_type}${entry.target_id ? ` · ${entry.target_id.slice(0, 8)}` : ""}`
    : null;

  return (
    <div className="rounded-2xl bg-card p-3 card-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-primary truncate">{entry.action}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{whenStr}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground truncate">
        {entry.actor_email ?? entry.actor_user_id.slice(0, 8)}
        {target && <span className="mx-1.5">·</span>}
        {target}
      </div>
      {entry.reason && (
        <p className="mt-1 text-xs text-foreground/80 line-clamp-2">{entry.reason}</p>
      )}
    </div>
  );
}
