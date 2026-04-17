import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppMode, type ModuleFlags } from "@/lib/app-mode";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2 } from "lucide-react";

export function ModuleGate({ module, children }: { module: keyof ModuleFlags; children: ReactNode }) {
  const mode = useAppMode();
  if (mode.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!mode.modules[module]) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useOrganization();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
