import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useOrgStatus } from "@/hooks/useOrgStatus";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { guardLog } from "@/lib/guard-diag";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating, loading: impersonationLoading } = useImpersonation();
  const { isAccessible, loading: statusLoading } = useOrgStatus();
  const location = useLocation();

  const resolvedOnceRef = useRef(false);
  const fullyResolved =
    !authLoading && !orgLoading && !paLoading && !impersonationLoading && !statusLoading;
  useEffect(() => {
    if (fullyResolved) resolvedOnceRef.current = true;
  }, [fullyResolved]);

  if (!resolvedOnceRef.current && !fullyResolved) {
    guardLog("protected", "loading", {
      path: location.pathname,
      authLoading,
      orgLoading,
      paLoading,
      impersonationLoading,
      statusLoading,
    });
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    guardLog("protected", "redirect-login", { path: location.pathname });
    return <Navigate to="/login" replace />;
  }

  if (isPlatformAdmin && !isImpersonating && !membership) {
    if (location.pathname === "/") {
      guardLog("protected", "redirect-super-admin");
      return <Navigate to="/super-admin" replace />;
    }
    guardLog("protected", "allow-platform-admin", { path: location.pathname });
    return <>{children}</>;
  }

  if (!membership) {
    guardLog("protected", "redirect-org-setup", { path: location.pathname });
    return <Navigate to="/org-setup" replace />;
  }

  if (!isAccessible && !isPlatformAdmin) {
    if (location.pathname !== "/account-unavailable") {
      guardLog("protected", "redirect-account-unavailable");
      return <Navigate to="/account-unavailable" replace />;
    }
  }

  guardLog("protected", "allow", { path: location.pathname });
  return <>{children}</>;
}
