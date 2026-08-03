import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppMode, type ModuleFlags } from "@/lib/app-mode";
import { useOrganization } from "@/hooks/useOrganization";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Silent redirects feel like "nothing happened" — always say why. */
function DeniedRedirect({ message }: { message: string }) {
  useEffect(() => {
    toast.error(message);
  }, [message]);
  return <Navigate to="/" replace />;
}

export function ModuleGate({ module, children }: { module: keyof ModuleFlags; children: ReactNode }) {
  const mode = useAppMode();
  if (mode.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!mode.modules[module]) {
    return <DeniedRedirect message="That feature isn't enabled for your organization." />;
  }
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useOrganization();
  const { isImpersonating, loading: impersonationLoading } = useImpersonation();
  if (loading || impersonationLoading || (isImpersonating && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) {
    return <DeniedRedirect message="Admin access is required for that screen." />;
  }
  return <>{children}</>;
}

export function EngineBossGate({ children }: { children: ReactNode }) {
  const { isEngineBoss, loading, membership } = useOrganization();
  const { isImpersonating, loading: impersonationLoading } = useImpersonation();
  // membership can still be hydrating right after a cold start / reload —
  // don't bounce back to Home before we actually know the role.
  if (loading || impersonationLoading || !membership || (isImpersonating && !isEngineBoss)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isEngineBoss) {
    return <DeniedRedirect message="Only admins and engine bosses can open that screen." />;
  }
  return <>{children}</>;
}

