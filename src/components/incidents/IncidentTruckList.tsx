import { useIncidentTrucks, useAvailableTrucks, useAssignTruck, useUpdateTruckStatus } from "@/hooks/useIncidentTrucks";
import { TRUCK_STATUS_LABELS } from "@/services/incident-trucks";
import type { IncidentTruckStatus, IncidentTruckWithTruck } from "@/services/incident-trucks";
import { Truck, Plus, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TruckCrewSection } from "./TruckCrewSection";
import { TruckInfoSection } from "@/components/fleet/TruckInfoSection";
import { ShiftList } from "@/components/shifts/ShiftList";
import { ResourceOrderSection } from "./ResourceOrderSection";
import { AgreementUpload } from "./AgreementUpload";
import { ShiftTicketSection } from "@/components/shift-tickets/ShiftTicketSection";
import { useOrganization } from "@/hooks/useOrganization";

const truckStatuses: IncidentTruckStatus[] = ["assigned", "active", "demobed", "completed"];

interface Props {
  incidentId: string;
  incidentName?: string;
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
                <Truck className="h-4 w-4 text-muted-foreground" />
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
      {incidentTrucks?.map((it) => {
        const isExpanded = expandedTruck === it.id;
        return (
          <div key={it.id} className="rounded-xl bg-card overflow-hidden">
            <button
              onClick={() => setExpandedTruck(isExpanded ? null : it.id)}
              className="flex w-full items-center justify-between p-4 text-left touch-target"
            >
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{it.trucks.name}</p>
                  <StatusBadge status={it.status as IncidentTruckStatus} />
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-4">
                {/* Truck Info (collapsible) */}
                <TruckInfoSection truck={it.trucks} />

                {/* Status changer */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Change Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {truckStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(it, s)}
                        disabled={statusMutation.isPending}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium touch-target ${
                          it.status === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {TRUCK_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource Orders */}
                <ResourceOrderSection incidentTruckId={it.id} />

                {/* Agreements for this truck */}
                <AgreementUpload incidentTruckId={it.id} label="Truck Agreements" />

                {/* Crew section */}
                <TruckCrewSection incidentTruckId={it.id} />

                {/* Shifts section */}
                <ShiftList
                  incidentTruckId={it.id}
                  incidentId={incidentId}
                  truckName={it.trucks.name}
                  truckMake={it.trucks.make}
                  truckModel={it.trucks.model}
                  truckVin={it.trucks.vin}
                  truckPlate={it.trucks.plate}
                  truckUnitType={it.trucks.unit_type}
                  incidentName={incidentName}
                />

                {/* OF-297 Shift Tickets */}
                <ShiftTicketSection
                  incidentTruckId={it.id}
                  incidentId={incidentId}
                  truckName={it.trucks.name}
                  truckMake={it.trucks.make}
                  truckModel={it.trucks.model}
                  truckVin={it.trucks.vin}
                  truckPlate={it.trucks.plate}
                  truckUnitType={it.trucks.unit_type}
                  incidentName={incidentName}
                />
              </div>
            )}
          </div>
        );
      })}
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
