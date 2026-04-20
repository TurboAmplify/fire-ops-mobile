import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";

interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: string;
  seatLimit: number;
  tier: string;
  seatsUsed: number;
}

interface OrganizationContextType {
  membership: OrgMembership | null;
  loading: boolean;
  isAdmin: boolean;
  /** All orgs the current user belongs to (real memberships, not impersonation). */
  memberships: OrgMembership[];
  /** Switch the active org (persists across reloads via localStorage). */
  setActiveOrgId: (orgId: string) => void;
  refetch: () => Promise<void>;
}

const ACTIVE_ORG_KEY = "fireops_active_org_id";

const OrganizationContext = createContext<OrganizationContextType>({
  membership: null,
  loading: true,
  isAdmin: false,
  memberships: [],
  setActiveOrgId: () => {},
  refetch: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isImpersonating, target } = useImpersonation();
  const [allMemberships, setAllMemberships] = useState<OrgMembership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_ORG_KEY);
  });
  const [impersonatedMembership, setImpersonatedMembership] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembership = useCallback(async () => {
    if (!user) {
      setAllMemberships([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(name, seat_limit, tier)")
        .eq("user_id", user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        setAllMemberships([]);
        setLoading(false);
        return;
      }

      const orgIds = data.map((row: any) => row.organization_id);

      // Count seats used (members + pending invites) per org in two grouped queries
      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id")
          .in("organization_id", orgIds),
        supabase
          .from("organization_invites")
          .select("organization_id")
          .in("organization_id", orgIds)
          .eq("status", "pending"),
      ]);

      const memberCounts = new Map<string, number>();
      (membersRes.data ?? []).forEach((r: any) => {
        memberCounts.set(r.organization_id, (memberCounts.get(r.organization_id) ?? 0) + 1);
      });
      const inviteCounts = new Map<string, number>();
      (invitesRes.data ?? []).forEach((r: any) => {
        inviteCounts.set(r.organization_id, (inviteCounts.get(r.organization_id) ?? 0) + 1);
      });

      const built: OrgMembership[] = data.map((row: any) => {
        const org = row.organizations ?? {};
        const orgId = row.organization_id;
        return {
          organizationId: orgId,
          organizationName: org.name ?? "",
          role: row.role,
          seatLimit: org.seat_limit ?? 5,
          tier: org.tier ?? "free",
          seatsUsed: (memberCounts.get(orgId) ?? 0) + (inviteCounts.get(orgId) ?? 0),
        };
      });

      // Sort alphabetically for stable display
      built.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
      setAllMemberships(built);
    } catch (err) {
      console.error("Failed to fetch org memberships:", err);
      setAllMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchMembership();
  }, [user?.id, fetchMembership]);

  // Active real membership: prefer localStorage selection, else first
  const realMembership = useMemo(() => {
    if (allMemberships.length === 0) return null;
    if (activeOrgId) {
      const found = allMemberships.find((m) => m.organizationId === activeOrgId);
      if (found) return found;
    }
    return allMemberships[0];
  }, [allMemberships, activeOrgId]);

  // If a stored/selected activeOrgId isn't in our loaded memberships (e.g. the
  // user was just added to a new org elsewhere), refetch once to pick it up.
  useEffect(() => {
    if (!user || !activeOrgId) return;
    if (allMemberships.length === 0) return;
    if (allMemberships.some((m) => m.organizationId === activeOrgId)) return;
    fetchMembership();
  }, [user, activeOrgId, allMemberships, fetchMembership]);

  const setActiveOrgId = useCallback((orgId: string) => {
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      // ignore quota / privacy errors
    }
    setActiveOrgIdState(orgId);
  }, []);

  // When impersonating, build a synthetic membership for the target org so all
  // org-scoped queries/mutations transparently target the impersonated org.
  useEffect(() => {
    if (!isImpersonating || !target) {
      setImpersonatedMembership(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("name, seat_limit, tier")
          .eq("id", target.organizationId)
          .maybeSingle();
        if (cancelled) return;
        setImpersonatedMembership({
          organizationId: target.organizationId,
          organizationName: data?.name ?? target.organizationName ?? "",
          role: "admin", // platform admin acts as org admin while viewing
          seatLimit: data?.seat_limit ?? 0,
          tier: data?.tier ?? "free",
          seatsUsed: 0,
        });
      } catch {
        if (!cancelled) {
          setImpersonatedMembership({
            organizationId: target.organizationId,
            organizationName: target.organizationName ?? "",
            role: "admin",
            seatLimit: 0,
            tier: "free",
            seatsUsed: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isImpersonating, target?.organizationId, target?.organizationName]);

  const membership = useMemo(
    () => (isImpersonating ? impersonatedMembership : realMembership),
    [isImpersonating, impersonatedMembership, realMembership],
  );

  const isAdmin = membership?.role === "admin";

  return (
    <OrganizationContext.Provider
      value={{
        membership,
        loading,
        isAdmin,
        memberships: allMemberships,
        setActiveOrgId,
        refetch: fetchMembership,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
