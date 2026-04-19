import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns whether the current user is on the platform_admins allow-list.
 * Platform admin is separate from (and far more privileged than) org admin.
 */
export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["platform-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return false;
      // RLS only lets platform admins see the row, so a successful read = admin.
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // Non-admins get filtered out by RLS (no row, no error). A real error
        // means something else went wrong — treat as not-admin to be safe.
        console.warn("platform_admin check failed:", error.message);
        return false;
      }
      return !!data;
    },
  });

  return {
    isPlatformAdmin: query.data === true,
    loading: authLoading || query.isLoading,
  };
}
