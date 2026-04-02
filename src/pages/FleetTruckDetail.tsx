import { useParams, Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useTruck, useDeleteTruck } from "@/hooks/useFleet";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TruckHeroPhoto } from "@/components/fleet/TruckHeroPhoto";
import { TruckInfoSection } from "@/components/fleet/TruckInfoSection";
import { TruckPhotoSection } from "@/components/fleet/TruckPhotoSection";
import { TruckDocumentSection } from "@/components/fleet/TruckDocumentSection";
import { TruckChecklistSection } from "@/components/fleet/TruckChecklistSection";
import { TruckServiceLogSection } from "@/components/fleet/TruckServiceLogSection";
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
import { useState } from "react";

export default function FleetTruckDetail() {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const { data: truck, isLoading } = useTruck(truckId!);
  const deleteMutation = useDeleteTruck();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(truckId!);
      toast.success("Truck deleted");
      navigate("/fleet");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete truck");
    }
    setShowDeleteDialog(false);
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

  return (
    <AppShell
      title={truck.name}
      headerRight={
        <div className="flex items-center gap-1.5">
          <Link
            to={`/fleet/${truckId}/edit`}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 h-9 text-sm font-semibold text-secondary-foreground active:bg-secondary/70"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteMutation.isPending}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-destructive/10 text-destructive active:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Hero Photo */}
        <TruckHeroPhoto
          truckId={truckId!}
          photoUrl={(truck as any).photo_url ?? null}
          truckName={truck.name}
        />

        {/* Collapsible Info Section */}
        <TruckInfoSection truck={truck} />

        {/* Checklist */}
        <TruckChecklistSection truckId={truckId!} />

        {/* Additional Photos */}
        <TruckPhotoSection truckId={truckId!} />

        {/* Documents */}
        <TruckDocumentSection truckId={truckId!} />

        {/* Service & Maintenance */}
        <TruckServiceLogSection truckId={truckId!} />
      </div>

      {/* Delete truck confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Truck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{truck.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
