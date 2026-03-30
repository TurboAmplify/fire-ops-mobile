import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { TruckForm } from "@/components/fleet/TruckForm";
import { useCreateTruck } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { initializeDefaultChecklist } from "@/services/fleet";
import { toast } from "sonner";
import type { TruckInsert } from "@/services/fleet";

export default function FleetTruckCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateTruck();
  const { membership } = useOrganization();

  const handleSubmit = async (data: TruckInsert) => {
    try {
      const truck = await createMutation.mutateAsync(data);
      // Initialize default checklist for new truck
      if (membership) {
        try {
          await initializeDefaultChecklist(truck.id, membership.organizationId);
        } catch {
          // Non-critical — don't block navigation
        }
      }
      toast.success("Truck added");
      navigate(`/fleet/${truck.id}`);
    } catch {
      toast.error("Failed to add truck");
    }
  };

  return (
    <AppShell title="Add Truck">
      <div className="p-4">
        <TruckForm onSubmit={handleSubmit as any} isPending={createMutation.isPending} />
      </div>
    </AppShell>
  );
}
