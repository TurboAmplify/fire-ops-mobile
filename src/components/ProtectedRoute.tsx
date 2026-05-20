import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useOrgStatus } from "@/hooks/useOrgStatus";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating } = useImpersonation();
  const { isAccessible, loading: statusLoading } = useOrgStatus();
  const location = useLocation();

  // "Have we ever resolved?" — once true, we never flip back to the global
  // spinner just because a background refetch briefly toggles loading=true.
  // That toggling is what made the home page appear to "loop" — guards kept
  // unmounting Dashboard and remounting it on every cache revalidation.
  const resolvedOnceRef = useRef(false);
  const fullyResolved =
    !authLoading && !orgLoading && !paLoading && !statusLoading;
  useEffect(() => {
    if (fullyResolved) resolvedOnceRef.current = true;
  }, [fullyResolved]);

  if (!resolvedOnceRef.current && !fullyResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Platform admins without org membership: send to /super-admin from "/", allow free nav elsewhere.
  if (isPlatformAdmin && !isImpersonating && !membership) {
    if (location.pathname === "/") {
      return <Navigate to="/super-admin" replace />;
    }
    return <>{children}</>;
  }

  if (!membership) {
    return <Navigate to="/org-setup" replace />;
  }

  // Subscription gate (silent — no billing copy, no external URLs).
  // Platform admins bypass so they can always investigate.
  if (!isAccessible && !isPlatformAdmin) {
    if (location.pathname !== "/account-unavailable") {
      return <Navigate to="/account-unavailable" replace />;
    }
  }

  return <>{children}</>;
}
