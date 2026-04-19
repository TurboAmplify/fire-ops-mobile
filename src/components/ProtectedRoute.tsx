import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  if (authLoading || orgLoading || paLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Platform admins: default landing is /super-admin (unless impersonating).
  // Hitting "/" with no membership shouldn't bounce them to org-setup.
  if (isPlatformAdmin && !isImpersonating) {
    if (location.pathname === "/") {
      return <Navigate to="/super-admin" replace />;
    }
    // Platform admin without an org membership: allow them to navigate
    // anywhere instead of forcing org-setup.
    if (!membership) {
      return <>{children}</>;
    }
  }

  if (!membership) {
    return <Navigate to="/org-setup" replace />;
  }

  return <>{children}</>;
}
