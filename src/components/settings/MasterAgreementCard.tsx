import { useState } from "react";
import { useAgreements, useCreateAgreement, useDeleteAgreement } from "@/hooks/useAgreements";
import { uploadAgreementFile } from "@/services/agreements";
import { useOrganization } from "@/hooks/useOrganization";
import { SignedLink } from "@/components/ui/SignedLink";
import { FileText, Upload, Loader2, Trash2, ScrollText } from "lucide-react";
import { toast } from "sonner";

/**
 * Master Agreement = the org-wide, yearly contract (e.g. Forest Service IBPA).
 * Stored in the agreements table with both incident_id and incident_truck_id null.
 * Admin-only.
 */
export function MasterAgreementCard() {
  const { membership, isAdmin } = useOrganization();
  const orgId = membership?.organizationId;
  const params = { orgOnly: true, organizationId: orgId };
  const { data: agreements, isLoading } = useAgreements(params);
  const createMutation = useCreateAgreement(params);
  const deleteMutation = useDeleteAgreement(params);
  const [uploading, setUploading] = useState(false);

  if (!isAdmin) return null;

  const current = agreements?.[0]; // most recent

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await uploadAgreementFile(file, orgId);
      await createMutation.mutateAsync({
        incident_id: null,
        incident_truck_id: null,
        file_url: fileUrl,
        file_name: file.name,
      });
      toast.success(current ? "Master Agreement replaced" : "Master Agreement uploaded");
    } catch {
      toast.error("Failed to upload agreement");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5" />
          Master Agreement
        </h2>
      </div>

      <div className="rounded-xl bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          The yearly contract used across all your incidents (e.g. Forest Service IBPA).
          Replace once or twice a year as needed.
        </p>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !current && (
          <p className="text-sm text-muted-foreground py-2">No Master Agreement uploaded yet.</p>
        )}

        {current && (
          <SignedLink
            href={current.file_url}
            className="flex items-center gap-3 rounded-lg bg-secondary p-3 touch-target"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{current.file_name}</p>
              <p className="text-[11px] text-muted-foreground">
                Uploaded {new Date(current.created_at).toLocaleDateString()}
              </p>
            </div>
          </SignedLink>
        )}

        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground cursor-pointer touch-target active:opacity-90">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{uploading ? "Uploading..." : current ? "Replace" : "Upload"}</span>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {current && (
            <button
              onClick={() => handleDelete(current.id)}
              disabled={deleteMutation.isPending}
              className="rounded-lg p-2.5 text-destructive active:bg-destructive/10 touch-target"
              aria-label="Delete master agreement"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
