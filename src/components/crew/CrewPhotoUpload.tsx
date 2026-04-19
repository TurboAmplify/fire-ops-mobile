import { useRef } from "react";
import { useUploadCrewPhoto, useDeleteCrewPhoto } from "@/hooks/useCrewMembers";
import { useOrganization } from "@/hooks/useOrganization";
import { Camera, ImageIcon, Trash2, Loader2, User } from "lucide-react";
import { SignedImage } from "@/components/ui/SignedImage";
import { toast } from "sonner";

interface Props {
  memberId: string;
  photoUrl: string | null;
  name: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CrewPhotoUpload({ memberId, photoUrl, name }: Props) {
  const { membership } = useOrganization();
  const uploadMutation = useUploadCrewPhoto(memberId);
  const deleteMutation = useDeleteCrewPhoto(memberId);
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
    <div className="flex flex-col items-center gap-3">
      {/* Avatar - tappable to upload */}
      <label className="relative cursor-pointer group">
        <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/20 bg-secondary">
          {photoUrl ? (
            <SignedImage
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent">
              <span className="text-2xl font-bold text-accent-foreground">
                {getInitials(name || "?")}
              </span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </label>

      {/* Action buttons */}
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <Camera className="h-3.5 w-3.5" />
          Take Photo
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
        <label className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <ImageIcon className="h-3.5 w-3.5" />
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
            className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive touch-target active:bg-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
