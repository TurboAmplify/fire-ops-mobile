import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

interface OrganizationContextType {
  membership: OrgMembership | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  membership: null,
  loading: true,
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
        .select("organization_id, role, organizations(name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const orgName = (data as any).organizations?.name ?? "";
        setMembership({
          organizationId: data.organization_id,
          organizationName: orgName,
          role: data.role,
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

  return (
    <OrganizationContext.Provider
      value={{ membership, loading, refetch: fetchMembership }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
