import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save, Send, FileDown, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EvalBody } from "@/components/evals/EvalBody";
import { EvalSignatureBlock } from "@/components/evals/EvalSignatureBlock";
import { SendEvalLinkSheet } from "@/components/evals/SendEvalLinkSheet";
import { EvalReviewDialog } from "@/components/evals/EvalReviewDialog";
import type { EvalView } from "@/components/evals/EvalViewToggle";
import { EMPTY_EVAL_VALUE, toFormValue, type EvalFormValue } from "@/components/evals/types";
import { useEval, useUpdateEval, useDeleteEval } from "@/hooks/useEvals";
import { uploadEvalSignature } from "@/services/evals";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { handleMutationError } from "@/lib/offline-guard";
import { getLocalDateString } from "@/lib/local-date";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  newEvalToken,
  remarksRequired,
  ratedFactorCount,
  type EvalDirection,
  type EvalStatus,
} from "@/lib/eval-225";
import { generateEvalPdf, fetchPngBytes } from "@/lib/pdf-eval-225";
import { getViewableUrl } from "@/lib/storage-url";
import { shareOrDownload, safeFilename, primeMobileDelivery } from "@/services/reports/exporters/share";

export default function EvalEdit() {
  const { evalId } = useParams<{ evalId: string }>();
  const navigate = useNavigate();
  const { data: row, isLoading } = useEval(evalId);
  const update = useUpdateEval();
  const del = useDeleteEval();
  const { membership } = useOrganization();
  const { user } = useAuth();

  const [view, setView] = useState<EvalView>("easy");
  const [value, setValue] = useState<EvalFormValue>(EMPTY_EVAL_VALUE);
  const [hydrated, setHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMode, setSendMode] = useState<"request" | "acknowledge" | "view">("acknowledge");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Review-before-send: hold the pending share mode until the user confirms.
  const [reviewMode, setReviewMode] = useState<"request" | "acknowledge" | "view" | null>(null);

  useEffect(() => {
    if (row && !hydrated) {
      const v = toFormValue(row as unknown as Record<string, unknown>);
      const today = getLocalDateString();
      setValue({
        ...v,
        assignment_from: v.assignment_from || today,
        assignment_to: v.assignment_to || today,
        rater_name: v.rater_name || (user?.user_metadata?.full_name as string) || "",
        rater_home_unit: v.rater_home_unit || membership?.organizationName || "",
      });
      setHydrated(true);
      // Persist the auto-filled dates so the texted link and PDF carry them
      // even if the user never taps Save.
      if (row.status !== "complete" && (!v.assignment_from || !v.assignment_to)) {
        update
          .mutateAsync({
            id: row.id,
            patch: { assignment_from: v.assignment_from || today, assignment_to: v.assignment_to || today } as never,
          })
          .catch(() => {
            /* non-blocking */
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, hydrated, user, membership]);

  const direction = (row?.direction ?? "internal") as EvalDirection;
  const status = (row?.status ?? "draft") as EvalStatus;
  const locked = status === "complete";
  const patchValue = (p: Partial<EvalFormValue>) => setValue((prev) => ({ ...prev, ...p }));

  const dbPatch = useMemo(
    () => ({
      subject_name: value.subject_name || null,
      subject_home_unit: value.subject_home_unit || null,
      fire_name: value.fire_name || null,
      fire_number: value.fire_number || null,
      fire_location: value.fire_location || null,
      fire_position: value.fire_position || null,
      assignment_from: value.assignment_from || null,
      assignment_to: value.assignment_to || null,
      acres_burned: value.acres_burned || null,
      fuel_types: value.fuel_types || null,
      work_category: value.work_categories[0] ?? value.work_category,
      work_categories: value.work_categories,
      work_category_other: value.work_category_other || null,
      ratings: value.ratings as never,
      other_factor_label: value.other_factor_label || null,
      remarks: value.remarks || null,
      rater_name: value.rater_name || null,
      rater_home_unit: value.rater_home_unit || null,
      rater_position: value.rater_position || null,
    }),
    [value],
  );

  const save = async (extra: Record<string, unknown> = {}, quiet = false) => {
    if (!evalId) return false;
    setBusy(true);
    try {
      await update.mutateAsync({ id: evalId, patch: { ...dbPatch, ...extra } as never });
      if (!quiet) toast.success("Saved");
      return true;
    } catch (err) {
      handleMutationError(err, "Could not save the eval");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const captureSignature = async (_type: "rater", blob: Blob) => {
    if (!evalId) return;
    setBusy(true);
    try {
      const url = await uploadEvalSignature(blob, evalId, "rater");
      const now = new Date().toISOString();
      const today = getLocalDateString();
      const extra: Record<string, unknown> = {
        rater_signature_url: url,
        rater_signed_at: now,
        rater_signed_date: today,
        status: "complete",
        submitted_at: now,
      };
      await update.mutateAsync({ id: evalId, patch: { ...dbPatch, ...extra } as never });
      toast.success("Signature saved");
    } catch (err) {
      handleMutationError(err, "Could not save the signature");
    } finally {
      setBusy(false);
    }
  };


  const openSend = async (mode: "request" | "acknowledge" | "view" = "acknowledge") => {
    if (!row) return;
    setReviewMode(null);
    setSendMode(mode);
    if (!row.public_token) {
      const ok = await save({ public_token: newEvalToken() }, true);
      if (!ok) return;
    } else if (mode !== "view") {
      await save({}, true);
    }
    setSending(true);
  };

  const exportPdf = async () => {
    if (!row) return;
    primeMobileDelivery();
    setExporting(true);
    try {
      // Signatures live in a private bucket — sign the URLs before fetching.
      const [raterUrl, empUrl] = await Promise.all([
        getViewableUrl(row.rater_signature_url),
        getViewableUrl(row.employee_signature_url),
      ]);
      const [raterPng, empPng] = await Promise.all([fetchPngBytes(raterUrl), fetchPngBytes(empUrl)]);
      const bytes = await generateEvalPdf({
        ...value,
        ratings: value.ratings,
        raterSignaturePng: raterPng,
        employeeSignaturePng: empPng,
        rater_signed_date: row.rater_signed_date,
        employee_signed_date: row.employee_signed_date,
      });
      await shareOrDownload(
        safeFilename(`ICS225_${value.subject_name || "eval"}`, "pdf"),
        bytes,
        "application/pdf",
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not build the PDF");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !row) {
    return (
      <AppShell title="Evaluation" showBack>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const needsRemarks = remarksRequired(value.ratings) && !value.remarks.trim();
  // Evals sent out for an outside supervisor to fill out: the form itself only
  // matters to them (they see it in the texted link), so lead with the send action.
  const sendOnly = direction === "inbound_request" && !locked;

  return (
    <AppShell title="Performance Eval" showBack>
      <div className="space-y-4 p-4 pb-8">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4 card-shadow">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{value.subject_name || "Unnamed"}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {sendOnly
                ? value.fire_name
                  ? `Rating request · ${value.fire_name}`
                  : "Rating request"
                : `${ratedFactorCount(value.ratings)} of 10 factors rated`}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {needsRemarks && !sendOnly && (
          <div className="rounded-xl bg-amber-500/10 p-3 text-[12px] font-medium text-amber-700">
            A rating of 0 or 1 requires written remarks before this eval is valid.
          </div>
        )}

        {sendOnly ? (
          <>
            <div className="rounded-2xl bg-card p-4 card-shadow">
              <p className="text-sm font-bold">Send this to the rater</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                They'll get a link that opens the eval on their phone — no app or login. You'll see it here once
                they've filled it out and signed.
              </p>
              <button
                onClick={() => setReviewMode("request")}
                disabled={busy}
                className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Review and text
                the rater a link
              </button>
            </div>

            <details className="rounded-2xl bg-card p-4 card-shadow">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                Assignment details (optional)
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  — prefill the fire info for them
                </span>
              </summary>
              <div className="mt-4">
                <EvalBody
                  view={view}
                  onViewChange={setView}
                  value={value}
                  onChange={patchValue}
                  lockSubject
                  showRaterFields={false}
                />
                <button
                  onClick={() => save()}
                  disabled={busy}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details
                </button>
              </div>
            </details>
          </>
        ) : (
          <>
            <EvalBody
              view={view}
              onViewChange={setView}
              value={value}
              onChange={patchValue}
              lockSubject={direction !== "outward"}
              showRaterFields
              disabled={locked}
            >
              {!locked && (
                <EvalSignatureBlock
                  raterUrl={row.rater_signature_url}
                  raterName={value.rater_name}
                  onRaterNameChange={(v) => patchValue({ rater_name: v })}
                  onCapture={captureSignature}
                  busy={busy}
                />

              )}
            </EvalBody>

            {!locked && (
              <div className="space-y-2">
                <button
                  onClick={() => save()}
                  disabled={busy}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save
                </button>

                <button
                  onClick={() => setReviewMode("acknowledge")}
                  disabled={busy}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Review and text for signature
                </button>
              </div>
            )}
          </>
        )}


        {locked && (
          <div className="rounded-2xl bg-card p-4 card-shadow">
            <p className="text-sm font-bold">Share the signed eval</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Send a link instead of a file. Whoever gets it can open the eval on their phone and download the PDF — no
              app or login needed.
            </p>
            <button
              onClick={() => setReviewMode("view")}
              disabled={busy}
              className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />} Review and share
              link
            </button>
          </div>
        )}

        <button
          onClick={exportPdf}
          disabled={exporting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Download ICS-225
          PDF
        </button>

        <button
          onClick={async () => {
            if (!evalId) return;
            try {
              await del.mutateAsync(evalId);
              toast.success("Eval deleted");
              navigate("/evals");
            } catch (err) {
              handleMutationError(err, "Could not delete the eval");
            }
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete eval
        </button>
      </div>

      <EvalReviewDialog
        open={reviewMode !== null}
        onClose={() => setReviewMode(null)}
        value={value}
        confirmLabel={reviewMode === "view" ? "Looks good — share the link" : "Looks good — get the link"}
        onConfirm={async () => {
          const mode = reviewMode ?? "acknowledge";
          await openSend(mode);
        }}
      />

      {row.public_token && (
        <SendEvalLinkSheet
          open={sending}
          onClose={() => setSending(false)}
          token={row.public_token}
          mode={sendMode}
          subjectName={value.subject_name}
          fireName={value.fire_name}
        />
      )}
    </AppShell>
  );
}
