import { useIncidentTrucks, useAvailableTrucks, useAssignTruck, useUpdateTruckStatus, useRemoveTruck } from "@/hooks/useIncidentTrucks";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { TRUCK_STATUS_LABELS } from "@/services/incident-trucks";
import type { IncidentTruckStatus, IncidentTruckWithTruck } from "@/services/incident-trucks";
import { Truck as TruckIcon, Plus, Loader2, ChevronDown, ChevronRight, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TruckCrewSection } from "./TruckCrewSection";
import { ResourceOrderSection } from "./ResourceOrderSection";
import { AgreementUpload } from "./AgreementUpload";
import { ShiftTicketSection } from "@/components/shift-tickets/ShiftTicketSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const truckStatuses: IncidentTruckStatus[] = ["assigned", "active", "demobed", "completed"];

interface Props {
  incidentId: string;
  incidentName?: string;
  organizationId?: string | null;
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

export function IncidentTruckList({ incidentId, incidentName, organizationId }: Props) {
  const { data: incidentTrucks, isLoading } = useIncidentTrucks(incidentId);
  const { data: allTrucks } = useAvailableTrucks(organizationId ?? undefined);
  const assignMutation = useAssignTruck(incidentId);
  const statusMutation = useUpdateTruckStatus(incidentId);
  const removeMutation = useRemoveTruck(incidentId);
  const [showAssign, setShowAssign] = useState(false);
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const assignedTruckIds = new Set(incidentTrucks?.map((it) => it.truck_id));
  const unassigned = allTrucks?.filter((t) => !assignedTruckIds.has(t.id)) ?? [];

  const handleAssign = async (truckId: string) => {
    try {
      await assignMutation.mutateAsync(truckId);
      toast.success("Truck assigned");
      setShowAssign(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign truck");
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

  const handleRemove = async (it: IncidentTruckWithTruck) => {
    try {
      await removeMutation.mutateAsync(it.id);
      toast.success(`${it.trucks.name} removed from incident`);
      setConfirmRemoveId(null);
      if (expandedTruck === it.id) setExpandedTruck(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove. Truck may have shift tickets or other data attached.");
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
            <p className="text-sm text-muted-foreground">
              {(allTrucks?.length ?? 0) === 0
                ? "You don't have access to any trucks yet. Ask an admin to grant you truck access."
                : "All your accessible trucks are already assigned."}
            </p>
          ) : (
            unassigned.map((truck) => {
              const subtitle = [truck.unit_type, truck.make, truck.model].filter(Boolean).join(" ");
              return (
                <button
                  key={truck.id}
                  onClick={() => handleAssign(truck.id)}
                  disabled={assignMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-lg bg-secondary p-3 text-left transition-transform active:scale-[0.98] touch-target"
                >
                  <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{truck.name}</p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    )}
                  </div>
                </button>
              );
            })
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
          organizationId={organizationId ?? undefined}
          confirmRemove={confirmRemoveId === it.id}
          onConfirmRemove={() => setConfirmRemoveId(it.id)}
          onCancelRemove={() => setConfirmRemoveId(null)}
          onRemove={() => handleRemove(it)}
          removing={removeMutation.isPending && confirmRemoveId === it.id}
        />
      ))}
    </section>
  );
}

function TruckCard({
  it,
  isExpanded,
  onToggle,
  onStatusChange,
  statusMutation,
  incidentId,
  incidentName,
  organizationId,
  confirmRemove,
  onConfirmRemove,
  onCancelRemove,
  onRemove,
  removing,
}: {
  it: IncidentTruckWithTruck;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (it: IncidentTruckWithTruck, status: IncidentTruckStatus) => void;
  statusMutation: ReturnType<typeof useUpdateTruckStatus>;
  incidentId: string;
  incidentName?: string;
  organizationId?: string;
  confirmRemove: boolean;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  // Always fetch crew so we can show warning on collapsed card too
  const { data: crew } = useIncidentTruckCrew(it.id);
  const activeCrew = crew?.filter((c) => c.is_active) ?? [];
  const noCrewAssigned = crew !== undefined && activeCrew.length === 0;
  const [autoOpenCrew, setAutoOpenCrew] = useState(false);
  const photoUrl = (it.trucks as any).photo_url;

  const handleAddCrewClick = () => {
    setAutoOpenCrew(true);
  };

  return (
    <div className="rounded-xl bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left touch-target"
      >
        <div className="flex items-center gap-3">
          <TruckIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold">{it.trucks.name}</p>
            <div className="flex items-center gap-2">
              <StatusBadge status={it.status as IncidentTruckStatus} />
              {noCrewAssigned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mt-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  No Crew
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2 animate-fade-in">
          {/* Status changer */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Change Status</p>
            <div className="flex gap-2 flex-wrap">
              {truckStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(it, s)}
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

          {/* Crew warning banner */}
          {noCrewAssigned && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">No crew assigned</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add crew to this truck before creating shift tickets</p>
              </div>
              <button
                onClick={handleAddCrewClick}
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white active:bg-amber-600 touch-target"
              >
                Add Crew
              </button>
            </div>
          )}

          {/* Crew — always visible at top, primary action */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Crew</p>
            <TruckCrewSection incidentTruckId={it.id} autoOpen={autoOpenCrew || noCrewAssigned} />
          </div>

          {/* OF-297 Shift Tickets */}
          <SectionHeader label="OF-297 Shift Tickets" defaultOpen={true}>
            <ShiftTicketSection
              incidentTruckId={it.id}
              incidentId={incidentId}
              organizationId={organizationId}
              truckName={it.trucks.name}
              truckMake={it.trucks.make}
              truckModel={it.trucks.model}
              truckVin={it.trucks.vin}
              truckPlate={it.trucks.plate}
              truckUnitType={it.trucks.unit_type}
              incidentName={incidentName}
            />
          </SectionHeader>

          {/* Truck Details */}
          <SectionHeader label="Truck Details">
            <div className="space-y-3 pt-1">
              <div className="flex gap-3 items-start">
                <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-secondary">
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt={it.trucks.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TruckIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-bold truncate">{it.trucks.name}</p>
                  {(it.trucks.make || it.trucks.model) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[it.trucks.year, it.trucks.make, it.trucks.model].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {it.trucks.unit_type && <p className="text-xs text-muted-foreground">{it.trucks.unit_type}</p>}
                  {it.trucks.plate && <p className="text-xs"><span className="text-muted-foreground">Plate:</span> {it.trucks.plate}</p>}
                  {it.trucks.vin && <p className="text-xs truncate"><span className="text-muted-foreground">VIN:</span> {it.trucks.vin}</p>}
                </div>
              </div>

              {(() => {
                const t = it.trucks as any;
                const details = [
                  { label: "Water Capacity", value: t.water_capacity },
                  { label: "Pump Type", value: t.pump_type },
                  { label: "Fuel Type", value: t.fuel_type },
                  { label: "Fuel Capacity", value: t.fuel_capacity ? `${t.fuel_capacity} gal` : null },
                  { label: "Engine", value: t.engine_type },
                  { label: "Bed Length", value: t.bed_length },
                  { label: "DOT #", value: t.dot_number },
                  { label: "Mileage", value: t.current_mileage ? `${Number(t.current_mileage).toLocaleString()} mi` : null },
                  { label: "GVWR", value: t.gvwr ? `${Number(t.gvwr).toLocaleString()} lbs` : null },
                  { label: "Weight (Empty)", value: t.weight_empty ? `${Number(t.weight_empty).toLocaleString()} lbs` : null },
                  { label: "Weight (Full)", value: t.weight_full ? `${Number(t.weight_full).toLocaleString()} lbs` : null },
                ].filter((d) => d.value);
                if (details.length === 0) return null;
                return (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {details.map((d) => (
                      <div key={d.label}>
                        <p className="text-[10px] text-muted-foreground">{d.label}</p>
                        <p className="text-xs font-medium">{d.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(it.trucks as any).notes && (
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Notes:</span> {(it.trucks as any).notes}</p>
              )}
            </div>
          </SectionHeader>

          {/* Resource Orders */}
          <SectionHeader label="Resource Orders">
            <ResourceOrderSection incidentTruckId={it.id} />
          </SectionHeader>

          {/* Agreements */}
          <SectionHeader label="Agreements">
            <AgreementUpload incidentTruckId={it.id} label="Truck Agreements" />
          </SectionHeader>

          {/* Remove from incident */}
          <div className="pt-3 border-t border-border">
            {!confirmRemove ? (
              <button
                onClick={onConfirmRemove}
                className="flex items-center gap-2 text-sm font-medium text-destructive touch-target"
              >
                <X className="h-4 w-4" />
                Remove from incident
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">
                  Remove {it.trucks.name} from this incident?
                </p>
                <p className="text-xs text-muted-foreground">
                  This won't delete the truck, only its assignment. Shift tickets, expenses, or crew tied to this assignment may block removal.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onRemove}
                    disabled={removing}
                    className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground touch-target flex items-center justify-center gap-2"
                  >
                    {removing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Yes, Remove
                  </button>
                  <button
                    onClick={onCancelRemove}
                    className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold text-secondary-foreground touch-target"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
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
