import { useState } from "react";
import {
  useIncidentDocuments,
  useCreateIncidentDocument,
  useDeleteIncidentDocument,
} from "@/hooks/useIncidentDocuments";
import { uploadIncidentDocumentFile } from "@/services/incident-documents";
import { useOrganization } from "@/hooks/useOrganization";
import { SignedLink } from "@/components/ui/SignedLink";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  incidentId: string;
  /** Incident status — controls whether missing-form is flagged as a warning. */
  incidentStatus?: string;
}

/**
 * OF-286 (Emergency Equipment Use Invoice) upload card.
 * Closure of the incident is NOT blocked when missing — but a clear
 * "Missing OF-286" warning is shown until at least one is uploaded.
 */
export function OF286UploadCard({ incidentId }: Props) {
  const { membership } = useOrganization();
  const { data: docs, isLoading } = useIncidentDocuments(incidentId, "of286");
  const createMutation = useCreateIncidentDocument(incidentId);
  const deleteMutation = useDeleteIncidentDocument(incidentId);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasDoc = (docs?.length ?? 0) > 0;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!membership?.organizationId) {
      toast.error("No organization selected");
      return;
    }
    setUploading(true);
    try {
      const fileUrl = await uploadIncidentDocumentFile(
        file,
        membership.organizationId,
        incidentId,
      );
      await createMutation.mutateAsync({
        document_type: "of286",
        file_url: fileUrl,
        file_name: file.name,
      });
      toast.success("OF-286 uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload OF-286");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("OF-286 removed");
      setConfirmDeleteId(null);
    } catch {
      toast.error("Failed to remove document");
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        hasDoc
          ? "border-success/30 bg-success/5"
          : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {hasDoc ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold">OF-286 Invoice</p>
            <p className="text-xs text-muted-foreground">
              {hasDoc
                ? "Signed invoice on file. Required for accounts receivable."
                : "Missing — upload the signed OF-286 to enable invoicing."}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer touch-target shrink-0">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? "Uploading..." : hasDoc ? "Replace" : "Upload"}</span>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      )}

      {hasDoc && (
        <div className="space-y-2">
          {docs!.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-lg bg-background/60 p-2.5"
            >
              <SignedLink
                href={doc.file_url}
                className="flex items-center gap-2 min-w-0 flex-1 touch-target"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </SignedLink>
              {confirmDeleteId === doc.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-md bg-destructive px-2 py-1 text-[11px] font-bold text-destructive-foreground touch-target"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-secondary-foreground touch-target"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(doc.id)}
                  className="text-muted-foreground hover:text-destructive touch-target p-1"
                  aria-label="Remove document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
