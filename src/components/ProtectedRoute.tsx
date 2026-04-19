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

  // Platform admins without any org membership: send them to /super-admin
  // when they hit "/", and allow free navigation elsewhere. Platform admins
  // who ARE members of an org should land on the normal Dashboard so the
  // "Home" button behaves like it does for any other admin.
  if (isPlatformAdmin && !isImpersonating && !membership) {
    if (location.pathname === "/") {
      return <Navigate to="/super-admin" replace />;
    }
    return <>{children}</>;
  }

  if (!membership) {
    return <Navigate to="/org-setup" replace />;
  }

  return <>{children}</>;
}
