import { ReactNode, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, loading: authLoading } = useAuth();
  const { isPlatformAdmin, loading } = usePlatformAdmin();
  const resolvedOnce = useRef(false);
  const gateLoading = authLoading || loading;

  useEffect(() => {
    if (!gateLoading) resolvedOnce.current = true;
  }, [gateLoading]);

  if (gateLoading && !resolvedOnce.current) {
    guardLog("super-admin", "loading", { authLoading, platformAdminLoading: loading });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    guardLog("super-admin", "redirect-login");
    return <Navigate to="/login" replace />;
  }

  if (!isPlatformAdmin) {
    guardLog("super-admin", "redirect-home");
    return <Navigate to="/" replace />;
  }

  guardLog("super-admin", "allow");
  return <>{children}</>;
}
