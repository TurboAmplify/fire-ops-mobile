import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [membership, setMembership] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembership = async () => {
    if (!user) {
      setMembership(null);
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

        setMembership({
          organizationId: orgId,
          organizationName: org.name ?? "",
          role: data.role,
          seatLimit: org.seat_limit ?? 5,
          tier: org.tier ?? "free",
          seatsUsed: (memberCount ?? 0) + (inviteCount ?? 0),
        });
      } else {
        setMembership(null);
      }
    } catch (err) {
      console.error("Failed to fetch org membership:", err);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMembership();
  }, [user?.id]);

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
