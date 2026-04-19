import { useImpersonation } from "@/hooks/useImpersonation";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { isImpersonating, target, stopViewAs } = useImpersonation();

  if (!isImpersonating || !target) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full border-b border-destructive/40 bg-destructive text-destructive-foreground shadow-sm"
    >
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-xs sm:text-sm">
          <span className="font-semibold">Super admin view-as</span>
          <span className="mx-1.5 opacity-70">·</span>
          <span className="truncate">{target.organizationName || target.organizationId}</span>
          <span className="mx-1.5 opacity-70">·</span>
          <span className="opacity-90">read-only</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => {
            void stopViewAs();
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Exit
        </Button>
      </div>
    </div>
  );
}
