import { useRef, useState } from "react";
import { useTruckDocuments, useUploadTruckDocument, useDeleteTruckDocument } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { FileText, Trash2, Loader2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DOC_TYPE_LABELS } from "@/services/fleet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignedLink } from "@/components/ui/SignedLink";

interface TruckDocumentSectionProps {
  truckId: string;
}

export function TruckDocumentSection({ truckId }: TruckDocumentSectionProps) {
  const { membership } = useOrganization();
  const { data: docs, isLoading } = useTruckDocuments(truckId);
  const uploadMutation = useUploadTruckDocument(truckId);
  const deleteMutation = useDeleteTruckDocument(truckId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("other");
  const [showUpload, setShowUpload] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    try {
      await uploadMutation.mutateAsync({
        orgId: membership.organizationId,
        file,
        docType,
      });
      toast.success("Document uploaded");
      setShowUpload(false);
    } catch {
      toast.error("Failed to upload document");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Document removed");
    } catch {
      toast.error("Failed to remove document");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Documents
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </button>
      </div>

      {showUpload && (
        <div className="rounded-xl bg-card p-3 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Document Type</p>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground cursor-pointer touch-target">
            <FileText className="h-4 w-4" />
            {uploadMutation.isPending ? "Uploading..." : "Choose File"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploadMutation.isPending}
            />
          </label>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!docs || docs.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No documents yet.</p>
      )}

      {docs && docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-card p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title || doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SignedLink
                  href={doc.file_url}
                  className="p-2 text-primary touch-target"
                >
                  <ExternalLink className="h-4 w-4" />
                </SignedLink>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-destructive touch-target"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
