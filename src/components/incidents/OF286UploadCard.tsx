import { useEffect, useState } from "react";
import {
  useIncidentDocuments,
  useCreateIncidentDocument,
  useDeleteIncidentDocument,
  useUpdateIncidentDocumentInvoiceTotal,
} from "@/hooks/useIncidentDocuments";
import { uploadIncidentDocumentFile } from "@/services/incident-documents";
import { useOrganization } from "@/hooks/useOrganization";
import { SignedLink } from "@/components/ui/SignedLink";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  Pencil,
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
 *
 * Once uploaded, the user is asked for the invoice total ($) so the P&L
 * report can show "Actual Profit" alongside Projected Profit.
 */
export function OF286UploadCard({ incidentId, incidentStatus }: Props) {
  const { membership } = useOrganization();
  const { data: docs, isLoading } = useIncidentDocuments(incidentId, "of286");
  const createMutation = useCreateIncidentDocument(incidentId);
  const deleteMutation = useDeleteIncidentDocument(incidentId);
  const updateTotalMutation = useUpdateIncidentDocumentInvoiceTotal(incidentId);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTotalId, setEditingTotalId] = useState<string | null>(null);
  const [totalDraft, setTotalDraft] = useState("");

  const hasDoc = (docs?.length ?? 0) > 0;
  const flagMissing = !hasDoc && (incidentStatus === "demob" || incidentStatus === "closed");

  // Auto-prompt for invoice total when a brand-new doc lands without one.
  useEffect(() => {
    if (!docs || docs.length === 0) return;
    const first = docs[0];
    if (first.of286_invoice_total == null && editingTotalId !== first.id) {
      setEditingTotalId(first.id);
      setTotalDraft("");
    }
  }, [docs, editingTotalId]);

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

  const handleSaveTotal = async (id: string) => {
    const cleaned = totalDraft.trim().replace(/[$,]/g, "");
    const parsed = cleaned === "" ? null : Number(cleaned);
    if (parsed != null && !Number.isFinite(parsed)) {
      toast.error("Enter a valid dollar amount");
      return;
    }
    try {
      await updateTotalMutation.mutateAsync({ id, total: parsed });
      toast.success(parsed != null ? "Invoice total saved" : "Invoice total cleared");
      setEditingTotalId(null);
      setTotalDraft("");
    } catch {
      toast.error("Failed to save invoice total");
    }
  };

  const fmtMoney = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 card-shadow ${
        hasDoc
          ? "border-success/30 bg-success/5"
          : flagMissing
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {hasDoc ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          ) : flagMissing ? (
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold">OF-286 Invoice</p>
            <p className="text-xs text-muted-foreground">
              {hasDoc
                ? "Signed invoice on file. Required for accounts receivable."
                : flagMissing
                  ? "Missing — upload the signed OF-286 to enable invoicing."
                  : "Upload the signed OF-286 once received (typically at demob)."}
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
          {docs!.map((doc) => {
            const isEditing = editingTotalId === doc.id;
            const total = doc.of286_invoice_total;
            return (
              <div
                key={doc.id}
                className="rounded-lg bg-background/60 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
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

                {/* Invoice total — drives Actual Profit on P&L */}
                {isEditing ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      placeholder="Invoice total (e.g. 24850.00)"
                      value={totalDraft}
                      onChange={(e) => setTotalDraft(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                    <button
                      onClick={() => handleSaveTotal(doc.id)}
                      disabled={updateTotalMutation.isPending}
                      className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground touch-target disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingTotalId(null);
                        setTotalDraft("");
                      }}
                      className="text-[11px] font-semibold text-muted-foreground touch-target px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTotalId(doc.id);
                      setTotalDraft(total != null ? String(total) : "");
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md bg-background/80 px-2.5 py-1.5 text-left touch-target"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[11px] text-muted-foreground">Invoice total</span>
                      <span className="text-sm font-semibold">
                        {total != null ? fmtMoney(Number(total)) : "Not entered"}
                      </span>
                    </div>
                    <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground px-1">
            Invoice total powers "Actual Profit" on the P&L report.
          </p>
        </div>
      )}
    </div>
  );
}
