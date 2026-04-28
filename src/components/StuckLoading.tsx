import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface StuckLoadingProps {
  /** How long (ms) before we assume the load is stuck. Default 15s. */
  thresholdMs?: number;
  /** Called when the user taps Retry. */
  onRetry?: () => void;
  /** Optional custom label while loading. */
  label?: string;
}

/**
 * Drop-in replacement for a perpetual spinner. Shows a normal loading state
 * for the first `thresholdMs`; after that, switches to a "this is taking
 * longer than usual" UI with a Retry button so the user is never stranded.
 */
export function StuckLoading({ thresholdMs = 15_000, onRetry, label = "Loading..." }: StuckLoadingProps) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setStuck(true), thresholdMs);
    return () => window.clearTimeout(t);
  }, [thresholdMs]);

  if (!stuck) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">This is taking longer than usual</p>
        <p className="text-xs text-muted-foreground mt-1">
          Check your connection or try again.
        </p>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
