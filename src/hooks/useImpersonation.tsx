import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
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

const PRESERVED_QUERY_PREFIXES = new Set(["platform-admin", "super-admin", "platform-settings", "platform_settings"]);

function resetOrgScopedQueries(qc: QueryClient) {
  qc.removeQueries({
    predicate: (query) => {
      const first = query.queryKey[0];
      return typeof first !== "string" || !PRESERVED_QUERY_PREFIXES.has(first);
    },
  });
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { isPlatformAdmin, loading: platformAdminLoading } = usePlatformAdmin();
  const qc = useQueryClient();
  const [target, setTarget] = useState<ImpersonationTarget | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ImpersonationTarget;
      return parsed?.organizationId ? parsed : null;
    } catch {
      return null;
    }
  });

  // Restore from sessionStorage on mount (only valid for platform admins)
  useEffect(() => {
    if (platformAdminLoading) return;
    if (!isPlatformAdmin) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
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
  }, [isPlatformAdmin, platformAdminLoading]);

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
      // Flush org-scoped caches without clearing the platform-admin query. Clearing
      // everything can briefly make isPlatformAdmin=false and bounce / back to /super-admin.
      resetOrgScopedQueries(qc);
      await logPlatformAction("view_as_start", {
        targetType: "organization",
        targetId: orgId,
        payload: { organization_name: name },
      });
    },
    [isPlatformAdmin, qc],
  );

  const stopViewAs = useCallback(async () => {
    let prev: ImpersonationTarget | null = null;
    setTarget((p) => {
      prev = p;
      return null;
    });
    sessionStorage.removeItem(STORAGE_KEY);
    resetOrgScopedQueries(qc);
    if (prev) {
      await logPlatformAction("view_as_stop", {
        targetType: "organization",
        targetId: prev.organizationId,
        payload: { organization_name: prev.organizationName },
      });
    }
  }, [qc]);

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
