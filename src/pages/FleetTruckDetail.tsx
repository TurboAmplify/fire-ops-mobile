import { useParams, Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useTruck, useDeleteTruck } from "@/hooks/useFleet";
import { TRUCK_STATUS_LABELS, type TruckStatus } from "@/services/fleet";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TruckPhotoSection } from "@/components/fleet/TruckPhotoSection";
import { TruckDocumentSection } from "@/components/fleet/TruckDocumentSection";
import { TruckChecklistSection } from "@/components/fleet/TruckChecklistSection";
import { TruckServiceLogSection } from "@/components/fleet/TruckServiceLogSection";

export default function FleetTruckDetail() {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const { data: truck, isLoading } = useTruck(truckId!);
  const deleteMutation = useDeleteTruck();

  const handleDelete = async () => {
    if (!confirm("Delete this truck? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(truckId!);
      toast.success("Truck deleted");
      navigate("/fleet");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete truck");
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Truck">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!truck) {
    return (
      <AppShell title="Truck">
        <p className="py-12 text-center text-muted-foreground">Truck not found.</p>
      </AppShell>
    );
  }

  const status = truck.status as TruckStatus;
  const statusColors: Record<TruckStatus, string> = {
    available: "bg-success/15 text-success",
    deployed: "bg-primary/15 text-primary",
    maintenance: "bg-warning/15 text-warning",
  };

  const details = [
    { label: "Unit Type", value: truck.unit_type },
    { label: "Make", value: truck.make },
    { label: "Model", value: truck.model },
    { label: "Year", value: truck.year },
    { label: "Plate", value: truck.plate },
    { label: "VIN", value: truck.vin },
    { label: "Water Capacity", value: truck.water_capacity },
    { label: "Pump Type", value: truck.pump_type },
    { label: "DOT Number", value: truck.dot_number },
  ].filter((d) => d.value);

  return (
    <AppShell
      title={truck.name}
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            to={`/fleet/${truckId}/edit`}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground touch-target"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive touch-target"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Status & basic info */}
        <div className="rounded-xl bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{truck.name}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusColors[status]}`}>
              {TRUCK_STATUS_LABELS[status] ?? truck.status}
            </span>
          </div>

          {details.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {details.map((d) => (
                <div key={d.label}>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium">{String(d.value)}</p>
                </div>
              ))}
            </div>
          )}

          {truck.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{truck.notes}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <TruckChecklistSection truckId={truckId!} />

        {/* Photos */}
        <TruckPhotoSection truckId={truckId!} />

        {/* Documents */}
        <TruckDocumentSection truckId={truckId!} />
      </div>
    </AppShell>
  );
}
