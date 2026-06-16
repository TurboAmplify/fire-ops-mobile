import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Landmark, FileText, Send, Sparkles, AlertTriangle, CheckCircle2, Download, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { useIncidentDocuments } from "@/hooks/useIncidentDocuments";
import { useFactoringEnabled, useOrgFactoringSettings, useFactoringSubmissions } from "@/hooks/useFactoring";
import { useOrganization } from "@/hooks/useOrganization";
import { getDownloadUrl, getViewableUrl } from "@/lib/storage-url";
import { buildScheduleOfAccountsPdf } from "@/lib/pdf-schedule-of-accounts";
import { uploadFactoringSchedulePdf, updateOf286Parsed, type ScheduleLineItem } from "@/services/factoring";
import { Link } from "react-router-dom";
import { PdfPreview } from "@/components/ui/PdfPreview";

interface Props {
  incidentId: string;
}

interface DraftLine extends ScheduleLineItem {
  fileName: string;
}

export function FactoringSubmitCard({ incidentId }: Props) {
  const { membership, isAdmin } = useOrganization();
  const { data: enabled } = useFactoringEnabled();
  const { data: settings } = useOrgFactoringSettings();
  const { data: docs } = useIncidentDocuments(incidentId, "of286");
  const { data: submissions } = useFactoringSubmissions(incidentId);
  const qc = useQueryClient();

  const financeSigned = useMemo(
    () => (docs ?? []).filter((d) => d.stage === "finance_signed"),
    [docs],
  );

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reservePercent, setReservePercent] = useState("15");
  const [parsing, setParsing] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Inline-preview URL — prefer the signed Supabase URL (works in mobile webviews);
  // falls back to a `blob:` URL if signing fails.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingPdf, setPendingPdf] = useState<{ url: string; scheduleNumber: number } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ title: string; url: string; filename: string } | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState<{
    scheduleNumber: number;
    documentCount: number;
    recipient: string;
  } | null>(null);

  useEffect(() => {
    if (!financeSigned.length) {
      setLines([]);
      return;
    }
    setLines((prev) => {
      const byId = new Map(prev.map((l) => [l.document_id, l]));
      return financeSigned.map((d) => {
        const existing = byId.get(d.id);
        const cached = (d as any).of286_parsed as Record<string, any> | null;
        return existing ?? {
          document_id: d.id,
          fileName: d.file_name,
          account_debtor: cached?.account_debtor ?? cached?.dispatch_office ?? "",
          invoice_number: cached?.invoice_number ?? cached?.resource_order_number ?? "",
          invoice_amount: Number(cached?.invoice_amount ?? d.of286_invoice_total ?? 0) || 0,
          invoice_date: cached?.invoice_date ?? (d.signed_at ?? "").slice(0, 10),
        };
      });
    });
  }, [financeSigned]);

  useEffect(() => {
    if (settings?.reserve_percent != null) setReservePercent(String(settings.reserve_percent));
  }, [settings?.reserve_percent]);

  useEffect(() => {
    return () => {
      if (pdfViewer?.url.startsWith("blob:")) URL.revokeObjectURL(pdfViewer.url);
    };
  }, [pdfViewer?.url]);

  if (!enabled || !isAdmin) return null;

  // Dedupe duplicate uploads of the same invoice (e.g. unsigned original +
  // signed completed copy of the same OF-286). Two lines collapse to one when
  // they share an invoice number, OR — when invoice numbers are blank — when
  // they share the same (account_debtor, invoice_amount). The first occurrence
  // is kept; later ones are flagged as duplicates and excluded from totals and
  // the schedule submission.
  const duplicateIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const li of lines) {
      const inv = (li.invoice_number || "").trim().toLowerCase();
      const key = inv
        ? `inv:${inv}`
        : `fallback:${(li.account_debtor || "").trim().toLowerCase()}|${Number(li.invoice_amount) || 0}`;
      // Only treat as duplicate if we have something to key on
      const hasKey = inv || (li.account_debtor && Number(li.invoice_amount) > 0);
      if (!hasKey) continue;
      if (seen.has(key)) dupes.add(li.document_id);
      else seen.add(key);
    }
    return dupes;
  }, [lines]);

  const effectiveLines = useMemo(
    () => lines.filter((l) => !duplicateIds.has(l.document_id)),
    [lines, duplicateIds],
  );

  const totals = (() => {
    const total = effectiveLines.reduce((s, li) => s + (Number(li.invoice_amount) || 0), 0);
    const pct = parseFloat(reservePercent) || 0;
    return { total, reserve: total * (pct / 100), pct, count: effectiveLines.length };
  })();

  const seller = effectiveLines.find((l) => l.account_debtor)?.account_debtor || "";

  const settingsComplete =
    !!settings?.factor_contact_email &&
    !!settings?.signer_name &&
    !!settings?.signature_url;

  const updateLine = (id: string, patch: Partial<ScheduleLineItem>) => {
    setLines((prev) => prev.map((l) => (l.document_id === id ? { ...l, ...patch } : l)));
  };

  const showPdf = async (url: string | null | undefined, label = "PDF", filename = "document.pdf") => {
    const viewable = await getViewableUrl(url);
    if (!viewable) return toast.error(`${label} not available`);
    try {
      const res = await fetch(viewable);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfViewer({ title: label, url: blobUrl, filename });
    } catch {
      setPdfViewer({ title: label, url: viewable, filename });
    }
  };

  const downloadPdf = async (url: string | null | undefined, filename: string) => {
    const viewable = await getViewableUrl(url);
    if (!viewable) return toast.error("Download not available");
    try {
      const res = await fetch(viewable);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch {
      const downloadUrl = await getDownloadUrl(url, filename);
      if (!downloadUrl) return toast.error("Download not available");
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleAiExtract = async (docId: string) => {
    const doc = financeSigned.find((d) => d.id === docId);
    if (!doc) return;
    setParsing(docId);
    try {
      const fileUrl = await getViewableUrl(doc.file_url);
      if (!fileUrl) throw new Error("Could not access file");
      const { data, error } = await supabase.functions.invoke("parse-of286", {
        body: { fileUrl, documentId: doc.id },
      });
      if (error) throw error;
      const parsed = data?.parsed ?? {};
      await updateOf286Parsed(doc.id, parsed);
      updateLine(doc.id, {
        account_debtor: parsed.account_debtor || parsed.dispatch_office || "",
        invoice_number: parsed.invoice_number || parsed.resource_order_number || "",
        invoice_amount: Number(parsed.invoice_amount) || Number(doc.of286_invoice_total) || 0,
        invoice_date: parsed.invoice_date || (doc.signed_at ?? "").slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      toast.success("Extracted from OF-286");
    } catch (err: any) {
      toast.error(err?.message || "AI extraction failed");
    } finally {
      setParsing(null);
    }
  };

  const handleGeneratePreview = async () => {
    if (!settings) return;
    if (!settingsComplete) {
      toast.error("Complete factoring settings first (contact, signer name, signature)");
      return;
    }
    if (!lines.length) {
      toast.error("Add at least one OF-286");
      return;
    }
    setGenerating(true);
    setSentConfirmation(null);
    setReviewConfirmed(false);
    try {
      const sigBlob = settings.signature_url
        ? await fetchSignatureBlob(settings.signature_url)
        : null;
      const scheduleNumber = settings.next_schedule_number ?? 1;
      const pdfBlob = await buildScheduleOfAccountsPdf({
        factorCompanyName: settings.factor_company_name,
        scheduleDate: new Date(),
        scheduleNumber,
        seller,
        signerName: settings.signer_name || "",
        signerTitle: settings.signer_title || "Owner",
        agreementDate: settings.agreement_date,
        reservePercent: totals.pct,
        lineItems: lines,
        signaturePngBlob: sigBlob,
      });
      const url = await uploadFactoringSchedulePdf(
        membership!.organizationId,
        incidentId,
        pdfBlob,
        scheduleNumber,
      );
      setPendingPdf({ url, scheduleNumber });
      // Prefer a signed https URL — works in iOS/Android in-app webviews where
      // `blob:` previews silently fail. Fall back to blob if signing fails.
      const signed = await getViewableUrl(url).catch(() => null);
      setPreviewUrl(signed || URL.createObjectURL(pdfBlob));
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate schedule");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!pendingPdf) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-factoring-submission", {
        body: {
          incident_id: incidentId,
          document_ids: lines.map((l) => l.document_id),
          line_items: lines.map(({ fileName, ...rest }) => rest),
          seller,
          reserve_percent: totals.pct,
          schedule_pdf_url: pendingPdf.url,
          schedule_number: pendingPdf.scheduleNumber,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Factoring package sent");
      setSentConfirmation({
        scheduleNumber: pendingPdf.scheduleNumber,
        documentCount: financeSigned.length,
        recipient: settings?.factor_contact_email || "factoring contact",
      });
      setPreviewUrl(null);
      setPendingPdf(null);
      qc.invalidateQueries({ queryKey: ["factoring-submissions", incidentId] });
      qc.invalidateQueries({ queryKey: ["org-factoring-settings"] });
    } catch (err: any) {
      toast.error(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <>
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 card-shadow">
      <div className="flex items-start gap-2">
        <Landmark className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Invoice Factoring — Schedule of Accounts</p>
          <p className="text-xs text-muted-foreground">
            Generate a Schedule of Accounts from the finance-signed OF-286(s) and email the
            package to {settings?.factor_contact_name || "your factoring contact"}.
          </p>
        </div>
      </div>

      {!settingsComplete && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/40 p-2 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Factoring profile incomplete
            </p>
            <p className="text-muted-foreground">
              Configure factor contact, signer, and signature in{" "}
              <Link to="/settings/organization" className="underline">
                Organization Settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {sentConfirmation && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-bold text-success">Factoring package sent</p>
            <p className="text-muted-foreground">
              Schedule #{sentConfirmation.scheduleNumber} and {sentConfirmation.documentCount} dual-signed OF-286
              {sentConfirmation.documentCount === 1 ? "" : "s"} were emailed to {sentConfirmation.recipient}.
            </p>
          </div>
        </div>
      )}

      {financeSigned.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Waiting on a finance-signed OF-286 for this incident.
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((li) => {
            const isDup = duplicateIds.has(li.document_id);
            return (
            <div key={li.document_id} className={`rounded-lg border bg-background/60 p-2 space-y-1.5 ${isDup ? "border-amber-500/40 opacity-70" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">{li.fileName}</span>
                  {isDup && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 shrink-0">
                      Duplicate · excluded
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAiExtract(li.document_id)}
                  disabled={parsing === li.document_id}
                  className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-secondary-foreground touch-target disabled:opacity-40"
                >
                  {parsing === li.document_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI extract
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text" placeholder="Account debtor"
                  value={li.account_debtor}
                  onChange={(e) => updateLine(li.document_id, { account_debtor: e.target.value })}
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                />
                <input
                  type="text" placeholder="Invoice #"
                  value={li.invoice_number}
                  onChange={(e) => updateLine(li.document_id, { invoice_number: e.target.value })}
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                />
                <input
                  type="number" step="0.01" placeholder="Amount"
                  value={li.invoice_amount || ""}
                  onChange={(e) => updateLine(li.document_id, { invoice_amount: Number(e.target.value) || 0 })}
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                />
                <input
                  type="date"
                  value={li.invoice_date || ""}
                  onChange={(e) => updateLine(li.document_id, { invoice_date: e.target.value })}
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                />
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Reserve %</label>
            <input
              type="number" step="0.01"
              value={reservePercent}
              onChange={(e) => setReservePercent(e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs"
            />
          </div>

          <div className="rounded-lg bg-muted/40 p-2 text-xs space-y-0.5">
            <div className="flex justify-between"><span>Accounts</span><span className="font-bold">{totals.count}</span></div>
            <div className="flex justify-between"><span>Total amount sold</span><span className="font-bold">{fmt(totals.total)}</span></div>
            <div className="flex justify-between"><span>Reserve ({totals.pct}%)</span><span className="font-bold">{fmt(totals.reserve)}</span></div>
          </div>

          {!previewUrl ? (
            <button
              onClick={handleGeneratePreview}
              disabled={generating || !lines.length}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground touch-target disabled:opacity-40"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Generate Schedule of Accounts
            </button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">Review the factoring invoice package</p>
                    <p className="text-[11px] text-muted-foreground">
                      Open or download the Schedule of Accounts, then confirm it looks correct before sending.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => showPdf(pendingPdf?.url, "Schedule PDF", `Schedule-${pendingPdf?.scheduleNumber ?? "preview"}.pdf`)}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground touch-target"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Schedule PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPdf(pendingPdf?.url, `Schedule-${pendingPdf?.scheduleNumber ?? "preview"}.pdf`)}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-bold touch-target"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Schedule
                  </button>
                </div>
                {financeSigned.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Dual-signed OF-286 attachment{financeSigned.length === 1 ? "" : "s"} to send:
                    </p>
                    {financeSigned.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => showPdf(d.file_url, "OF-286", d.file_name || "OF-286.pdf")}
                        className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 text-left text-[11px] hover:bg-accent touch-target"
                      >
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{d.file_name}</span>
                        <span className="underline text-primary">View</span>
                      </button>
                    ))}
                  </div>
                )}
                <label className="flex items-start gap-2 rounded-md border border-border bg-background px-2 py-2 text-[11px] touch-target">
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    onChange={(e) => setReviewConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="leading-relaxed">
                    I reviewed the Schedule of Accounts and the dual-signed OF-286 attachment{financeSigned.length === 1 ? "" : "s"}; send this package to {settings?.factor_contact_name || settings?.factor_company_name || "the factor"}.
                  </span>
                </label>
              </div>

              {!settingsComplete && (
                <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] space-y-1">
                  <p className="font-semibold text-warning-foreground">
                    Finish factoring settings to enable sending
                  </p>
                  <p className="text-muted-foreground">
                    Add factor contact email, signer name, and signature in Settings → Factoring.
                  </p>
                  <a
                    href="/settings"
                    className="inline-block underline font-semibold text-primary"
                  >
                    Open Factoring Settings
                  </a>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !settingsComplete || !reviewConfirmed}
                title={!settingsComplete ? "Complete factoring settings first" : !reviewConfirmed ? "Review and confirm the package first" : undefined}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-xs font-bold text-primary-foreground touch-target disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Email Schedule + signed OF-286
                {financeSigned.length === 1 ? "" : "s"} to{" "}
                {settings?.factor_contact_name || settings?.factor_company_name || "factor"}
              </button>
              {settings?.factor_contact_email && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Sends to {settings.factor_contact_email}. A copy is saved under Submitted below.
                </p>
              )}
              <button
                onClick={() => { setPreviewUrl(null); setPendingPdf(null); setReviewConfirmed(false); }}
                className="w-full text-[11px] text-muted-foreground touch-target"
              >
                Discard preview & re-edit
              </button>
            </div>
          )}
        </div>
      )}

      {!!submissions?.length && (
        <div className="pt-2 border-t border-border space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Submitted</p>
          {submissions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="font-semibold">Schedule #{s.schedule_number}</span>
              <span className="text-muted-foreground">{fmt(Number(s.total_amount))}</span>
              <button
                type="button"
                onClick={() => showPdf(s.pdf_url, "Schedule PDF", `Schedule-${s.schedule_number}.pdf`)}
                className="ml-auto underline text-primary touch-target"
              >
                View PDF
              </button>
              <span className="text-muted-foreground">
                {new Date(s.submitted_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {pdfViewer && (
      <div className="fixed inset-0 z-50 bg-background/95 p-3 sm:p-6">
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{pdfViewer.title}</p>
            <button
              type="button"
              onClick={() => downloadPdf(pdfViewer.url, pdfViewer.filename)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold touch-target"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={() => setPdfViewer(null)}
              className="rounded-md border border-border bg-card p-2 touch-target"
              aria-label="Close PDF preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <PdfPreview url={pdfViewer.url} />
        </div>
      </div>
    )}
    </>
  );
}

async function fetchSignatureBlob(url: string): Promise<Blob | null> {
  try {
    const viewable = (await getViewableUrl(url)) ?? url;
    const r = await fetch(viewable);
    if (!r.ok) return null;
    return await r.blob();
  } catch {
    return null;
  }
}
