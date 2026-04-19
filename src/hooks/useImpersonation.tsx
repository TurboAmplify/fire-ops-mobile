import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { logPlatformAction } from "@/services/platform-audit";

const STORAGE_KEY = "fireops.viewAsOrgId";

interface ImpersonationTarget {
  organizationId: string;
  organizationName: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  target: ImpersonationTarget | null;
  startViewAs: (orgId: string, orgName?: string) => Promise<void>;
  stopViewAs: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  target: null,
  startViewAs: async () => {},
  stopViewAs: async () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { isPlatformAdmin } = usePlatformAdmin();
  const [target, setTarget] = useState<ImpersonationTarget | null>(null);

  // Restore from sessionStorage on mount (only valid for platform admins)
  useEffect(() => {
    if (!isPlatformAdmin) {
      setTarget(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ImpersonationTarget;
      if (parsed?.organizationId) setTarget(parsed);
    } catch {
      // ignore corrupt value
    }
  }, [isPlatformAdmin]);

  const startViewAs = useCallback(
    async (orgId: string, orgName?: string) => {
      if (!isPlatformAdmin) return;
      let name = orgName ?? "";
      if (!name) {
        const { data } = await supabase
          .rpc("admin_get_organization", { _org_id: orgId })
          .single();
        const obj = data as { name?: string } | null;
        name = obj?.name ?? "";
      }
      const next: ImpersonationTarget = { organizationId: orgId, organizationName: name };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setTarget(next);
      await logPlatformAction("view_as_start", {
        targetType: "organization",
        targetId: orgId,
        payload: { organization_name: name },
      });
    },
    [isPlatformAdmin],
  );

  const stopViewAs = useCallback(async () => {
    const prev = target;
    sessionStorage.removeItem(STORAGE_KEY);
    setTarget(null);
    if (prev) {
      await logPlatformAction("view_as_stop", {
        targetType: "organization",
        targetId: prev.organizationId,
        payload: { organization_name: prev.organizationName },
      });
    }
  }, [target]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!target && isPlatformAdmin,
        target: isPlatformAdmin ? target : null,
        startViewAs,
        stopViewAs,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

/**
 * Convenience selector for guards / read paths.
 */
export function useIsImpersonating() {
  return useImpersonation().isImpersonating;
}

// Note: read-only enforcement for platform admins viewing foreign orgs is
// handled at the database layer by guard_platform_admin_write triggers on
// every business table. The client cannot bypass it. There is intentionally
// no client-side assert helper because it would create false confidence —
// the DB is the source of truth.
