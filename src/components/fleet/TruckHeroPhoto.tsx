import { useRef } from "react";
import { useUpdateTruckHeroPhoto, useDeleteTruckHeroPhoto } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { Camera, ImageIcon, Trash2, Loader2, Truck as TruckIcon } from "lucide-react";
import { SignedImage } from "@/components/ui/SignedImage";
import { toast } from "sonner";

interface Props {
  truckId: string;
  photoUrl: string | null;
  truckName: string;
}

export function TruckHeroPhoto({ truckId, photoUrl, truckName }: Props) {
  const { membership } = useOrganization();
  const uploadMutation = useUpdateTruckHeroPhoto(truckId);
  const deleteMutation = useDeleteTruckHeroPhoto(truckId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    try {
      await uploadMutation.mutateAsync({ orgId: membership.organizationId, file });
      toast.success("Photo updated");
    } catch {
      toast.error("Failed to upload photo");
    }
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!confirm("Remove this photo?")) return;
    try {
      await deleteMutation.mutateAsync();
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="space-y-3">
      {/* Hero image area */}
      <div className="relative rounded-2xl overflow-hidden bg-secondary aspect-[16/7] max-h-40">
        {photoUrl ? (
          <SignedImage
            src={photoUrl}
            alt={truckName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <TruckIcon className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium opacity-50">No Photo Yet</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <Camera className="h-4 w-4" />
          Take Photo
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
        <label className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <ImageIcon className="h-4 w-4" />
          Upload Photo
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
        {photoUrl && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive touch-target active:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
