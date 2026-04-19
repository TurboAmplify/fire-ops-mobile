import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  membership: null,
  loading: true,
  isAdmin: false,
  refetch: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isImpersonating, target } = useImpersonation();
  const [realMembership, setRealMembership] = useState<OrgMembership | null>(null);
  const [impersonatedMembership, setImpersonatedMembership] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembership = async () => {
    if (!user) {
      setRealMembership(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(name, seat_limit, tier)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const org = (data as any).organizations ?? {};
        const orgId = data.organization_id;

        // Count seats used = members + pending invites
        const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
          supabase
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId),
          supabase
            .from("organization_invites")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "pending"),
        ]);

        setRealMembership({
          organizationId: orgId,
          organizationName: org.name ?? "",
          role: data.role,
          seatLimit: org.seat_limit ?? 5,
          tier: org.tier ?? "free",
          seatsUsed: (memberCount ?? 0) + (inviteCount ?? 0),
        });
      } else {
        setRealMembership(null);
      }
    } catch (err) {
      console.error("Failed to fetch org membership:", err);
      setRealMembership(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMembership();
  }, [user?.id]);

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
      value={{ membership, loading, isAdmin, refetch: fetchMembership }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
