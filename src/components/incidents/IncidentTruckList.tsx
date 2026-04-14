import { useIncidentTrucks, useAvailableTrucks, useAssignTruck, useUpdateTruckStatus } from "@/hooks/useIncidentTrucks";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { TRUCK_STATUS_LABELS } from "@/services/incident-trucks";
import type { IncidentTruckStatus, IncidentTruckWithTruck } from "@/services/incident-trucks";
import { Truck as TruckIcon, Plus, Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TruckCrewSection } from "./TruckCrewSection";
import { ShiftList } from "@/components/shifts/ShiftList";
import { ResourceOrderSection } from "./ResourceOrderSection";
import { AgreementUpload } from "./AgreementUpload";
import { ShiftTicketSection } from "@/components/shift-tickets/ShiftTicketSection";
import { useOrganization } from "@/hooks/useOrganization";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const truckStatuses: IncidentTruckStatus[] = ["assigned", "active", "demobed", "completed"];

interface Props {
  incidentId: string;
  incidentName?: string;
}

function SectionHeader({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-target">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function IncidentTruckList({ incidentId, incidentName }: Props) {
  const { membership } = useOrganization();
  const { data: incidentTrucks, isLoading } = useIncidentTrucks(incidentId);
  const { data: allTrucks } = useAvailableTrucks();
  const assignMutation = useAssignTruck(incidentId);
  const statusMutation = useUpdateTruckStatus(incidentId);
  const [showAssign, setShowAssign] = useState(false);
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);

  const assignedTruckIds = new Set(incidentTrucks?.map((it) => it.truck_id));
  const unassigned = allTrucks?.filter((t) => !assignedTruckIds.has(t.id)) ?? [];

  const handleAssign = async (truckId: string) => {
    try {
      await assignMutation.mutateAsync(truckId);
      toast.success("Truck assigned");
      setShowAssign(false);
    } catch {
      toast.error("Failed to assign truck");
    }
  };

  const handleStatusChange = async (it: IncidentTruckWithTruck, status: IncidentTruckStatus) => {
    try {
      await statusMutation.mutateAsync({ id: it.id, status });
      toast.success(`${it.trucks.name} → ${TRUCK_STATUS_LABELS[status]}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Assigned Trucks
        </h3>
        <button
          onClick={() => setShowAssign(!showAssign)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <Plus className="h-4 w-4" />
          Assign
        </button>
      </div>

      {/* Assign truck picker */}
      {showAssign && (
        <div className="rounded-xl bg-card p-3 space-y-2">
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trucks available to assign.</p>
          ) : (
            unassigned.map((truck) => (
              <button
                key={truck.id}
                onClick={() => handleAssign(truck.id)}
                disabled={assignMutation.isPending}
                className="flex w-full items-center gap-3 rounded-lg bg-secondary p-3 text-left transition-transform active:scale-[0.98] touch-target"
              >
                <TruckIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{truck.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!incidentTrucks || incidentTrucks.length === 0) && (
        <p className="text-sm text-muted-foreground py-4 text-center">No trucks assigned yet.</p>
      )}

      {/* Truck cards */}
      {incidentTrucks?.map((it) => (
        <TruckCard
          key={it.id}
          it={it}
          isExpanded={expandedTruck === it.id}
          onToggle={() => setExpandedTruck(expandedTruck === it.id ? null : it.id)}
          onStatusChange={handleStatusChange}
          statusMutation={statusMutation}
          incidentId={incidentId}
          incidentName={incidentName}
          organizationId={membership?.organizationId}
        />
      ))}
    </section>
  );
}

function StatusBadge({ status }: { status: IncidentTruckStatus }) {
  const colors: Record<IncidentTruckStatus, string> = {
    assigned: "bg-secondary text-secondary-foreground",
    active: "bg-primary/15 text-primary",
    demobed: "bg-warning/15 text-warning",
    completed: "bg-success/15 text-success",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase mt-0.5 ${colors[status]}`}>
      {TRUCK_STATUS_LABELS[status]}
    </span>
  );
}
