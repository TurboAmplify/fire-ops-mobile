import { ReactNode, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { guardLog } from "@/lib/guard-diag";

/**
 * Hides /super-admin/* routes from anyone not on the platform_admins allow-list.
 *
 * IMPORTANT: once we have ever resolved the platform-admin check, we never
 * flash back to the global spinner just because react-query toggles
 * `isLoading` during a background refetch. That toggling was causing the
 * super-admin route to remount and the Suspense fallback to re-fire in a
 * tight loop.
 */
export function PlatformAdminGate({ children }: { children: ReactNode }) {
  const { isPlatformAdmin, loading } = usePlatformAdmin();
  const resolvedOnce = useRef(false);

  useEffect(() => {
    if (!loading) resolvedOnce.current = true;
  }, [loading]);

  if (loading && !resolvedOnce.current) {
    guardLog("platform-admin", "loading");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    guardLog("platform-admin", "redirect-home");
    return <Navigate to="/" replace />;
  }

  guardLog("platform-admin", "allow");
  return <>{children}</>;
}
