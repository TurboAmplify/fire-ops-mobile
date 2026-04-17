import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAccessForTruck, useGrantAccess, useRevokeAccess } from "@/hooks/useCrewAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Plus, X, Loader2 } from "lucide-react";

interface Props {
  truckId: string;
}

export function TruckAccessSection({ truckId }: Props) {
  const { membership, isAdmin } = useOrganization();
  const { user } = useAuth();
  const { data: access, isLoading } = useAccessForTruck(truckId);
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();
  const [showPicker, setShowPicker] = useState(false);

  // Fetch all crew members in org (for picker)
  const { data: members = [] } = useQuery({
    queryKey: ["org-crew-members", membership?.organizationId],
    enabled: !!membership?.organizationId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role, profiles(full_name)")
        .eq("organization_id", membership!.organizationId)
        .eq("role", "crew");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin) return null;

  const grantedUserIds = new Set((access ?? []).map((a) => a.user_id));
  const ungrantedMembers = members.filter((m: any) => !grantedUserIds.has(m.user_id));

  const handleGrant = async (userId: string) => {
    if (!membership?.organizationId) return;
    try {
      await grant.mutateAsync({
        organizationId: membership.organizationId,
        userId,
        truckId,
        grantedBy: user?.id,
      });
      toast.success("Access granted");
      setShowPicker(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to grant access");
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      await revoke.mutateAsync({ userId, truckId });
      toast.success("Access removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove access");
    }
  };

  return (
    <div className="rounded-xl bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Crew Access</h3>
        </div>
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="flex items-center gap-1 text-xs font-medium text-primary touch-target"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (access ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No crew have explicit access. (Admins always have access.)
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(access ?? []).map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs"
            >
              {a.full_name || "Unnamed"}
              <button
                onClick={() => handleRevoke(a.user_id)}
                className="rounded-full p-0.5 hover:bg-background touch-target"
                aria-label="Remove access"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Grant access to:</p>
          {ungrantedMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No crew members to add. Invite crew first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ungrantedMembers.map((m: any) => (
                <button
                  key={m.user_id}
                  onClick={() => handleGrant(m.user_id)}
                  disabled={grant.isPending}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary touch-target active:scale-95"
                >
                  + {m.profiles?.full_name || "Unnamed"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
