import { useRef, useState } from "react";
import { useTruckPhotos, useUploadTruckPhoto, useDeleteTruckPhoto, useUpdateTruckPhotoLabel } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { Camera, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const PHOTO_LABELS = ["Exterior", "Interior", "VIN Plate", "Registration", "Damage", "Equipment", "Other"];

interface TruckPhotoSectionProps {
  truckId: string;
}

export function TruckPhotoSection({ truckId }: TruckPhotoSectionProps) {
  const { membership } = useOrganization();
  const { data: photos, isLoading } = useTruckPhotos(truckId);
  const uploadMutation = useUploadTruckPhoto(truckId);
  const deleteMutation = useDeleteTruckPhoto(truckId);
  const labelMutation = useUpdateTruckPhotoLabel(truckId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [labelingId, setLabelingId] = useState<string | null>(null);

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

  const handleLabel = async (id: string, label: string) => {
    try {
      await labelMutation.mutateAsync({ id, photoLabel: label });
      setLabelingId(null);
    } catch {
      toast.error("Failed to update label");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Truck Photos
        </h3>
      </div>

      {/* Prominent upload buttons */}
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary cursor-pointer touch-target active:bg-primary/10">
          <Camera className="h-5 w-5" />
          Take Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
        <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <ImageIcon className="h-5 w-5" />
          From Library
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
        <p className="text-sm text-muted-foreground text-center py-4">
          No photos yet. Tap Add Photo to capture VIN, registration, or truck condition.
        </p>
      )}

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg overflow-hidden bg-secondary">
              <div className="aspect-square">
                <img
                  src={photo.file_url}
                  alt={photo.photo_label || photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Label badge */}
              {photo.photo_label && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs font-medium text-white truncate">{photo.photo_label}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  onClick={() => setLabelingId(labelingId === photo.id ? null : photo.id)}
                  className="rounded-full bg-black/50 p-1.5 text-white touch-target"
                >
                  <Tag className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-full bg-destructive/80 p-1.5 text-destructive-foreground touch-target"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Label picker */}
              {labelingId === photo.id && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-2">
                  {PHOTO_LABELS.map((label) => (
                    <button
                      key={label}
                      onClick={() => handleLabel(photo.id, label)}
                      className={`w-full rounded px-2 py-1.5 text-xs font-medium touch-target ${
                        photo.photo_label === label
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
