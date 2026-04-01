import { useIncidentTruckCrew, useAvailableCrewMembers, useAssignCrew, useReleaseCrew } from "@/hooks/useIncidentTruckCrew";
import { Users, Plus, UserMinus, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  incidentTruckId: string;
}

export function TruckCrewSection({ incidentTruckId }: Props) {
  const { data: crew, isLoading } = useIncidentTruckCrew(incidentTruckId);
  const { data: allCrew } = useAvailableCrewMembers();
  const assignMutation = useAssignCrew(incidentTruckId);
  const releaseMutation = useReleaseCrew(incidentTruckId);
  const [showAssign, setShowAssign] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<{ id: string; name: string } | null>(null);
  const activeCrew = crew?.filter((c) => c.is_active) ?? [];
  const releasedCrew = crew?.filter((c) => !c.is_active) ?? [];

  // Filter out crew already assigned to this truck
  const activeAssignedIds = new Set(activeCrew.map((c) => c.crew_member_id));
  const available = allCrew?.filter((m) => !activeAssignedIds.has(m.id)) ?? [];

  const handleAssign = async (crewMemberId: string) => {
    try {
      await assignMutation.mutateAsync({ crewMemberId });
      toast.success("Crew member assigned");
      setShowAssign(false);
    } catch {
      toast.error("Failed to assign crew member");
    }
  };

  const handleRelease = async (assignmentId: string, name: string) => {
    try {
      await releaseMutation.mutateAsync(assignmentId);
      toast.success(`${name} released`);
    } catch {
      toast.error("Failed to release crew member");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Crew ({activeCrew.length})</span>
        </div>
        <button
          onClick={() => setShowAssign(!showAssign)}
          className="flex items-center gap-1 text-xs font-medium text-primary touch-target"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Assign picker */}
      {showAssign && (
        <div className="rounded-lg bg-secondary p-2 space-y-1 max-h-48 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No crew available.</p>
          ) : (
            available.map((m) => (
              <button
                key={m.id}
                onClick={() => handleAssign(m.id)}
                disabled={assignMutation.isPending}
                className="flex w-full items-center justify-between rounded-md p-2 text-left text-sm hover:bg-accent active:bg-accent touch-target"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </button>
            ))
          )}
        </div>
      )}

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {/* Active crew */}
      {activeCrew.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg bg-secondary p-2.5">
          <div>
            <p className="text-sm font-medium">{c.crew_members.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {c.role_on_assignment || c.crew_members.role}
            </p>
          </div>
          <button
            onClick={() => handleRelease(c.id, c.crew_members.name)}
            disabled={releaseMutation.isPending}
            className="rounded-lg p-2 text-destructive active:bg-destructive/10 touch-target"
            title="Release"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Released crew (collapsed) */}
      {releasedCrew.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1">
            {releasedCrew.length} released
          </summary>
          <div className="space-y-1 mt-1">
            {releasedCrew.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-2 opacity-60">
                <span>{c.crew_members.name}</span>
                <span className="text-[10px]">
                  Released {c.released_at ? new Date(c.released_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {!isLoading && activeCrew.length === 0 && !showAssign && (
        <p className="text-xs text-muted-foreground">No crew assigned.</p>
      )}
    </div>
  );
}
