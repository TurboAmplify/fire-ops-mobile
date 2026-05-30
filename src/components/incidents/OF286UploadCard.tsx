import { useEffect, useMemo, useState } from "react";
import {
  useIncidentDocuments,
  useCreateIncidentDocument,
  useDeleteIncidentDocument,
  useUpdateIncidentDocumentInvoiceTotal,
  useIncidentDocumentAudit,
  useLogIncidentDocumentEvent,
} from "@/hooks/useIncidentDocuments";
import {
  uploadIncidentDocumentFile,
  uploadSignatureImage,
  type IncidentDocument,
  type IncidentDocumentStage,
} from "@/services/incident-documents";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { SignedLink } from "@/components/ui/SignedLink";
import { SignaturePicker, type SignatureMetadata } from "@/components/shift-tickets/SignaturePicker";
import { stampSignatureOntoPdf, downloadBlob } from "@/lib/pdf-sign";
import { getViewableUrl } from "@/lib/storage-url";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  DollarSign,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Pencil,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  incidentId: string;
  incidentStatus?: string;
}

const STAGE_LABEL: Record<IncidentDocumentStage, string> = {
  original: "Original (unsigned)",
  contractor_signed: "Contractor signed",
  finance_signed: "Finance signed (final)",
};

const STAGE_ORDER: IncidentDocumentStage[] = [
  "original",
  "contractor_signed",
  "finance_signed",
];

export function OF286UploadCard({ incidentId, incidentStatus }: Props) {
  const { membership } = useOrganization();
  const { user } = useAuth();
  const { data: docs, isLoading } = useIncidentDocuments(incidentId, "of286");
  const { data: auditEntries } = useIncidentDocumentAudit(incidentId, "of286");
  const createMutation = useCreateIncidentDocument(incidentId);
  const deleteMutation = useDeleteIncidentDocument(incidentId);
  const updateTotalMutation = useUpdateIncidentDocumentInvoiceTotal(incidentId);
  const logEvent = useLogIncidentDocumentEvent(incidentId);

  const [uploadingStage, setUploadingStage] = useState<IncidentDocumentStage | null>(
    null,
  );
  const [signingDoc, setSigningDoc] = useState<IncidentDocument | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTotalId, setEditingTotalId] = useState<string | null>(null);
  const [totalDraft, setTotalDraft] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [stamping, setStamping] = useState(false);

  // Group docs by stage; pick the most recent of each.
  const byStage = useMemo(() => {
    const map: Partial<Record<IncidentDocumentStage, IncidentDocument>> = {};
    for (const d of docs ?? []) {
      const stage = (d.stage as IncidentDocumentStage) ?? "original";
      if (!map[stage]) map[stage] = d;
    }
    return map;
  }, [docs]);

  const original = byStage.original;
  const contractorSigned = byStage.contractor_signed;
  const financeSigned = byStage.finance_signed;
  const finalDoc = financeSigned ?? contractorSigned ?? original;

  const flagMissing =
    !original && (incidentStatus === "demob" || incidentStatus === "closed");

  // Auto-prompt for invoice total once finance-signed is uploaded.
  useEffect(() => {
    const target = finalDoc;
    if (!target) return;
    if (
      target.of286_invoice_total == null &&
      editingTotalId !== target.id &&
      target.stage === "finance_signed"
    ) {
      setEditingTotalId(target.id);
      setTotalDraft("");
    }
  }, [finalDoc, editingTotalId]);

  // ------- File upload (original or finance-signed) -------
  const handleStageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    stage: IncidentDocumentStage,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!membership?.organizationId) {
      toast.error("No organization selected");
      return;
    }
    setUploadingStage(stage);
    try {
      // For the finance-signed stage, rename the file to match our convention.
      let uploadName = file.name;
      if (stage === "finance_signed") {
        const sourceBase =
          (original?.file_name ?? file.name).replace(/\.[^.]+$/, "");
        uploadName = `${sourceBase} - signed - completed.pdf`;
      }
      const fileUrl = await uploadIncidentDocumentFile(
        file,
        membership.organizationId,
        incidentId,
        uploadName,
      );
      const replacingExisting = !!byStage[stage];
      await createMutation.mutateAsync({
        document_type: "of286",
        stage,
        parent_document_id: stage === "finance_signed" ? contractorSigned?.id ?? null : null,
        file_url: fileUrl,
        file_name: uploadName,
      });
      if (replacingExisting) {
        await logEvent.mutateAsync({
          document_id: byStage[stage]?.id ?? null,
          stage,
          event_type: "replaced",
          file_name: byStage[stage]?.file_name ?? null,
          notes: `Replaced with ${file.name}`,
        });
      }
      toast.success(`${STAGE_LABEL[stage]} uploaded`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingStage(null);
    }
  };

  // ------- Contractor signing flow -------
  const beginSign = (doc: IncidentDocument) => {
    setSigningDoc(doc);
    setSignatureOpen(true);
  };

  const handleSignatureSave = async (sigBlob: Blob, metadata: SignatureMetadata) => {
    if (!signingDoc || !membership?.organizationId) {
      setSignatureOpen(false);
      return;
    }
    setSignatureOpen(false);
    setStamping(true);
    try {
      const sourceUrl = await getViewableUrl(signingDoc.file_url);
      if (!sourceUrl) throw new Error("Could not access source document");

      const signerName =
        metadata.name?.trim() || user?.email || "Contractor";
      const signedAt = new Date();
      const signedPdf = await stampSignatureOntoPdf({
        sourceUrl,
        signaturePngBlob: sigBlob,
        signerName,
        signedAt,
      });

      const baseName = signingDoc.file_name.replace(/\.[^.]+$/, "");
      const signedFileName = `${baseName} - signed by contractor.pdf`;
      const fileUrl = await uploadIncidentDocumentFile(
        signedPdf,
        membership.organizationId,
        incidentId,
        signedFileName,
      );
      const sigUrl = await uploadSignatureImage(
        sigBlob,
        membership.organizationId,
        incidentId,
      );

      await createMutation.mutateAsync({
        document_type: "of286",
        stage: "contractor_signed",
        parent_document_id: signingDoc.id,
        file_url: fileUrl,
        file_name: signedFileName,
        signature_url: sigUrl,
        signed_by_name: signerName,
        signed_at: signedAt.toISOString(),
      });

      // If the original arrived via email, return the signed copy to the sender
      // as an email reply with the signed PDF attached. Otherwise, fall back to
      // the legacy "download so the user can email finance" flow.
      if (signingDoc.thread_id) {
        try {
          const safeName = signedFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${membership.organizationId}/${signingDoc.thread_id}/signed-${crypto.randomUUID()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("communication-attachments")
            .upload(path, signedPdf, { contentType: "application/pdf", upsert: false });
          if (upErr) throw upErr;

          const { error: sendErr } = await supabase.functions.invoke("send-thread-reply", {
            body: {
              thread_id: signingDoc.thread_id,
              body_text: `Signed OF-286 attached.\n\nSigned by ${signerName} on ${signedAt.toLocaleString()}.`,
              attachment_paths: [path],
            },
          });
          if (sendErr) throw sendErr;
          toast.success("Signed and returned to sender");
        } catch (e: any) {
          console.error("return-to-sender failed", e);
          downloadBlob(signedPdf, signedFileName);
          toast.error(
            `Signed, but could not auto-send: ${e?.message ?? "unknown error"}. Downloaded instead.`,
          );
        }
      } else {
        downloadBlob(signedPdf, signedFileName);
        toast.success("Signed and downloaded — send to finance");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign document");
    } finally {
      setStamping(false);
      setSigningDoc(null);
    }
  };

  // ------- Download with audit log -------
  const handleDownload = async (doc: IncidentDocument) => {
    const url = await getViewableUrl(doc.file_url);
    if (!url) {
      toast.error("Could not generate download link");
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      downloadBlob(blob, doc.file_name);
    } catch {
      // Fallback: trigger anchor download directly
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    await logEvent.mutateAsync({
      document_id: doc.id,
      stage: doc.stage,
      event_type: "downloaded",
      file_name: doc.file_name,
    });
  };

  const handleDelete = async (doc: IncidentDocument) => {
    try {
      await deleteMutation.mutateAsync({
        id: doc.id,
        stage: doc.stage,
        file_name: doc.file_name,
      });
      toast.success("Document removed");
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
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const allComplete = !!financeSigned;
  const cardBorder = allComplete
    ? "border-success/30 bg-success/5"
    : flagMissing
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-border bg-card";

  return (
    <div className={`rounded-xl border p-4 space-y-3 card-shadow ${cardBorder}`}>
      <div className="flex items-start gap-2">
        {allComplete ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : flagMissing ? (
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">OF-286 Invoice</p>
          <p className="text-xs text-muted-foreground">
            Three-stage workflow: upload original, sign and send to finance, then upload the
            finance-signed final.
          </p>
        </div>
      </div>

      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      )}

      {/* STAGE LIST */}
      <div className="space-y-2">
        {STAGE_ORDER.map((stage) => {
          const doc = byStage[stage];
          const stageNum = STAGE_ORDER.indexOf(stage) + 1;
          const isUploading = uploadingStage === stage;

          return (
            <div
              key={stage}
              className={`rounded-lg border p-2.5 ${
                doc ? "border-border bg-background/60" : "border-dashed border-border bg-background/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    doc
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stageNum}
                </span>
                <span className="text-xs font-semibold">{STAGE_LABEL[stage]}</span>
              </div>

              {doc ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <SignedLink
                      href={doc.file_url}
                      onClick={() => {
                        // log download as well (SignedLink opens in new tab)
                        logEvent.mutate({
                          document_id: doc.id,
                          stage: doc.stage,
                          event_type: "downloaded",
                          file_name: doc.file_name,
                        });
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 touch-target"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                          {doc.signed_by_name ? ` • Signed by ${doc.signed_by_name}` : ""}
                        </p>
                      </div>
                    </SignedLink>
                    {confirmDeleteId === doc.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(doc)}
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
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Stage-specific actions */}
                  <div className="flex flex-wrap gap-2">
                    {stage === "original" && (
                      <button
                        onClick={() => beginSign(doc)}
                        disabled={stamping}
                        className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground touch-target disabled:opacity-40"
                      >
                        {stamping ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileSignature className="h-3 w-3" />
                        )}
                        {contractorSigned ? "Re-sign & download" : "Sign & download"}
                      </button>
                    )}
                    {stage === "contractor_signed" && (
                      <button
                        onClick={() => beginSign(original ?? doc)}
                        disabled={stamping || !original}
                        className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary touch-target disabled:opacity-40"
                      >
                        <FileSignature className="h-3 w-3" />
                        Re-sign
                      </button>
                    )}
                    {stage === "contractor_signed" && (
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground touch-target"
                      >
                        <Download className="h-3 w-3" />
                        Download for finance
                      </button>
                    )}
                    {stage === "finance_signed" && (
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground touch-target"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    )}
                    {/* Replace */}
                    <label className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground cursor-pointer touch-target">
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Replace
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleStageUpload(e, stage)}
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  {/* Invoice total — only on finance-signed stage */}
                  {stage === "finance_signed" && (
                    <InvoiceTotalRow
                      doc={doc}
                      isEditing={editingTotalId === doc.id}
                      totalDraft={totalDraft}
                      onStart={() => {
                        setEditingTotalId(doc.id);
                        setTotalDraft(
                          doc.of286_invoice_total != null
                            ? String(doc.of286_invoice_total)
                            : "",
                        );
                      }}
                      onChange={setTotalDraft}
                      onSave={() => handleSaveTotal(doc.id)}
                      onCancel={() => {
                        setEditingTotalId(null);
                        setTotalDraft("");
                      }}
                      saving={updateTotalMutation.isPending}
                      fmtMoney={fmtMoney}
                    />
                  )}
                </div>
              ) : (
                <>
                  {stage === "contractor_signed" && original && (
                    <button
                      onClick={() => beginSign(original)}
                      disabled={stamping}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground touch-target disabled:opacity-40"
                    >
                      {stamping ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileSignature className="h-3.5 w-3.5" />
                      )}
                      Sign &amp; download original
                    </button>
                  )}
                  {stage === "contractor_signed" && !original ? (
                    <p className="text-[11px] text-muted-foreground italic px-1">
                      Upload the original first.
                    </p>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-semibold text-primary cursor-pointer touch-target">
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {isUploading
                        ? "Uploading…"
                        : stage === "contractor_signed"
                          ? "Or upload an already-signed copy"
                          : `Upload ${STAGE_LABEL[stage].toLowerCase()}`}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleStageUpload(e, stage)}
                        disabled={isUploading || (stage === "finance_signed" && !contractorSigned)}
                      />
                    </label>
                  )}
                  {stage === "finance_signed" && !contractorSigned && (
                    <p className="text-[10px] text-muted-foreground italic px-1 mt-1">
                      Available once the contractor-signed version exists.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* AUDIT TRAIL */}
      <div className="pt-1 border-t border-border">
        <button
          onClick={() => setShowAudit((v) => !v)}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground touch-target px-1 py-1.5"
        >
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Audit trail ({auditEntries?.length ?? 0})
          </span>
          {showAudit ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {showAudit && (
          <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
            {(auditEntries ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic px-1">
                No events yet.
              </p>
            ) : (
              (auditEntries ?? []).map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-2 rounded-md bg-background/50 px-2 py-1.5 text-[11px]"
                >
                  <span className="font-bold uppercase tracking-wide text-muted-foreground shrink-0 w-20">
                    {e.event_type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {e.stage ? STAGE_LABEL[e.stage as IncidentDocumentStage] ?? e.stage : ""}
                      {e.file_name ? ` — ${e.file_name}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleString()}
                      {e.actor_name ? ` • ${e.actor_name}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <SignaturePicker
        open={signatureOpen}
        onClose={() => {
          setSignatureOpen(false);
          setSigningDoc(null);
        }}
        onSave={handleSignatureSave}
        title="Sign OF-286"
        defaultName={user?.email ?? ""}
      />
    </div>
  );
}

function InvoiceTotalRow(props: {
  doc: IncidentDocument;
  isEditing: boolean;
  totalDraft: string;
  saving: boolean;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  fmtMoney: (n: number) => string;
}) {
  const { doc, isEditing, totalDraft, saving, onStart, onChange, onSave, onCancel, fmtMoney } = props;
  const total = doc.of286_invoice_total;
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="Invoice total (e.g. 24850.00)"
          value={totalDraft}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground touch-target disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] font-semibold text-muted-foreground touch-target px-1"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onStart}
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
  );
}
