import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

/**
 * Hides /super-admin/* routes from anyone not on the platform_admins allow-list.
 * Mirrors AdminGate but checks the cross-org platform role, not org role.
 */
export function PlatformAdminGate({ children }: { children: ReactNode }) {
  const { isPlatformAdmin, loading } = usePlatformAdmin();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
