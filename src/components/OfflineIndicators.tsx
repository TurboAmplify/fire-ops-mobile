import { Database } from "lucide-react";

interface Props {
  className?: string;
}

/** Small subtle pill shown on list pages when we're rendering cached data while offline. */
export function CachedDataPill({ className }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground ${className ?? ""}`}
    >
      <Database className="h-3 w-3" aria-hidden="true" />
      <span>Showing saved data</span>
    </div>
  );
}

/** Clean empty state when offline and the list was never loaded online. */
export function OfflineNoCacheEmpty({ label = "this list" }: { label?: string }) {
  return (
    <div className="py-16 text-center">
      <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        You're offline and {label} hasn't been loaded yet. Reconnect to view.
      </p>
    </div>
  );
}
