import { useState } from "react";
import { ChevronDown, ChevronRight, Truck as TruckIcon, Loader2, Users } from "lucide-react";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { TruckCrewSection } from "@/components/incidents/TruckCrewSection";

interface Props {
  incidentId: string;
  organizationId?: string | null;
}

function TruckCrewRow({
  incidentTruckId,
  truckName,
  unitType,
  organizationId,
  defaultOpen,
}: {
  incidentTruckId: string;
  truckName: string;
  unitType: string | null;
  organizationId?: string | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { data: crew } = useIncidentTruckCrew(incidentTruckId);
  const activeCount = crew?.filter((c) => c.is_active).length ?? 0;

  return (
    <div className="rounded-xl bg-secondary/30 border border-border/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-accent/40 touch-target"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{truckName}</p>
          {unitType && (
            <p className="text-[11px] text-muted-foreground truncate">{unitType}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {activeCount}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <TruckCrewSection
            incidentTruckId={incidentTruckId}
            organizationId={organizationId}
          />
        </div>
      )}
    </div>
  );
}

export function IncidentCrewAssignmentsSection({ incidentId, organizationId }: Props) {
  const { data: trucks, isLoading } = useIncidentTrucks(incidentId);
  const defaultOpen = (trucks?.length ?? 0) <= 2;

  return (
    <div className="rounded-xl bg-card p-4 space-y-3 card-shadow">
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Assigned Crew by Truck
        </h3>
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!trucks || trucks.length === 0) && (
        <p className="text-sm text-muted-foreground py-2">
          Assign a truck to this incident first, then add crew here.
        </p>
      )}

      {!isLoading && trucks && trucks.length > 0 && (
        <div className="space-y-2">
          {trucks.map((it) => (
            <TruckCrewRow
              key={it.id}
              incidentTruckId={it.id}
              truckName={it.trucks.name}
              unitType={it.trucks.unit_type}
              organizationId={organizationId}
              defaultOpen={defaultOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
