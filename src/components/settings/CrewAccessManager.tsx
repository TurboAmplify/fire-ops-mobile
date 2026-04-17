import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAccessForUser, useGrantAccess, useRevokeAccess } from "@/hooks/useCrewAccess";
import { toast } from "sonner";
import { ChevronRight, Loader2, Truck as TruckIcon, Check } from "lucide-react";

export function CrewAccessManager() {
  const { membership, isAdmin } = useOrganization();
  const orgId = membership?.organizationId;
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const { data: crewMembers = [], isLoading } = useQuery({
    queryKey: ["org-crew-list", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role, profiles(full_name)")
        .eq("organization_id", orgId!)
        .eq("role", "crew")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin) return null;

  return (
    <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : crewMembers.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No crew members yet. Invite crew first to manage their truck access.
        </p>
      ) : (
        crewMembers.map((m: any) => (
          <CrewRow
            key={m.user_id}
            userId={m.user_id}
            name={m.profiles?.full_name || "Unnamed"}
            isOpen={openUserId === m.user_id}
            onToggle={() =>
              setOpenUserId(openUserId === m.user_id ? null : m.user_id)
            }
            orgId={orgId!}
          />
        ))
      )}
    </div>
  );
}

function CrewRow({
  userId,
  name,
  isOpen,
  onToggle,
  orgId,
}: {
  userId: string;
  name: string;
  isOpen: boolean;
  onToggle: () => void;
  orgId: string;
}) {
  const { user } = useAuth();
  const { data: granted = [], isLoading } = useAccessForUser(orgId, userId);
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();

  // We need to fetch ALL trucks in org. Admins can see all via RLS.
  const { data: allTrucks = [] } = useQuery({
    queryKey: ["org-all-trucks", orgId],
    enabled: !!orgId && isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select("id, name, unit_type, make, model")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const grantedIds = new Set(granted.map((g) => g.truck_id));

  const handleToggle = async (truckId: string) => {
    try {
      if (grantedIds.has(truckId)) {
        await revoke.mutateAsync({ userId, truckId });
      } else {
        await grant.mutateAsync({
          organizationId: orgId,
          userId,
          truckId,
          grantedBy: user?.id,
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update access");
    }
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 touch-target"
      >
        <div className="text-left min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {granted.length} truck{granted.length === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2 animate-fade-in">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : allTrucks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No trucks in this org.</p>
          ) : (
            <div className="space-y-1.5">
              {allTrucks.map((t: any) => {
                const isGranted = grantedIds.has(t.id);
                const subtitle = [t.unit_type, t.make, t.model]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={t.id}
                    onClick={() => handleToggle(t.id)}
                    disabled={grant.isPending || revoke.isPending}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left touch-target ${
                      isGranted
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary"
                    }`}
                  >
                    <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      {subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    {isGranted && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
