import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { TruckForm } from "@/components/fleet/TruckForm";
import { useTruck, useUpdateTruck } from "@/hooks/useFleet";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TruckUpdate } from "@/services/fleet";

export default function FleetTruckEdit() {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const { data: truck, isLoading } = useTruck(truckId!);
  const updateMutation = useUpdateTruck(truckId!);

  const handleSubmit = async (data: TruckUpdate) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Truck updated");
      navigate(`/fleet/${truckId}`);
    } catch {
      toast.error("Failed to update truck");
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Edit Truck">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!truck) {
    return (
      <AppShell title="Edit Truck">
        <p className="py-12 text-center text-muted-foreground">Truck not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Truck">
      <div className="p-4">
        <TruckForm truck={truck} onSubmit={handleSubmit as any} isPending={updateMutation.isPending} />
      </div>
    </AppShell>
  );
}
