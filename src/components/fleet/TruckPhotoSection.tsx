import { useRef } from "react";
import { useTruckPhotos, useUploadTruckPhoto, useDeleteTruckPhoto } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TruckPhotoSectionProps {
  truckId: string;
}

export function TruckPhotoSection({ truckId }: TruckPhotoSectionProps) {
  const { membership } = useOrganization();
  const { data: photos, isLoading } = useTruckPhotos(truckId);
  const uploadMutation = useUploadTruckPhoto(truckId);
  const deleteMutation = useDeleteTruckPhoto(truckId);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    try {
      await uploadMutation.mutateAsync({ orgId: membership.organizationId, file });
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Truck Photos
        </h3>
        <label className="flex items-center gap-1 text-sm font-medium text-primary touch-target cursor-pointer">
          <Camera className="h-4 w-4" />
          Add Photo
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!photos || photos.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No photos yet.</p>
      )}

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg overflow-hidden bg-secondary aspect-square">
              <img
                src={photo.file_url}
                alt={photo.file_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deleteMutation.isPending}
                className="absolute top-1 right-1 rounded-full bg-destructive/80 p-1.5 text-destructive-foreground touch-target"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
