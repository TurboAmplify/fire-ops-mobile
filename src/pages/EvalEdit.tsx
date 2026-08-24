import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save, Send, FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EvalBody } from "@/components/evals/EvalBody";
import { EvalSignatureBlock } from "@/components/evals/EvalSignatureBlock";
import { SendEvalLinkSheet } from "@/components/evals/SendEvalLinkSheet";
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
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (row && !hydrated) {
      const v = toFormValue(row as unknown as Record<string, unknown>);
      setValue({
        ...v,
        rater_name: v.rater_name || (user?.user_metadata?.full_name as string) || "",
        rater_home_unit: v.rater_home_unit || membership?.organizationName || "",
      });
      setHydrated(true);
    }
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
      work_category: value.work_category,
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

  const captureSignature = async (type: "rater" | "employee", blob: Blob) => {
    if (!evalId) return;
    setBusy(true);
    try {
      const url = await uploadEvalSignature(blob, evalId, type);
      const now = new Date().toISOString();
      const today = getLocalDateString();
      const extra: Record<string, unknown> =
        type === "rater"
          ? { rater_signature_url: url, rater_signed_at: now, rater_signed_date: today }
          : { employee_signature_url: url, employee_signed_at: now, employee_signed_date: today };
      const bothSigned =
        type === "employee"
          ? !!(row?.rater_signature_url || value.rater_name)
          : !!row?.employee_signature_url;
      if (type === "employee" && bothSigned) {
        extra.status = "complete";
        extra.submitted_at = now;
      } else if (type === "rater" && !row?.employee_signature_url) {
        extra.status = "awaiting_employee";
      }
      await update.mutateAsync({ id: evalId, patch: { ...dbPatch, ...extra } as never });
      toast.success(type === "rater" ? "Rater signature saved" : "Employee signature saved");
    } catch (err) {
      handleMutationError(err, "Could not save the signature");
    } finally {
      setBusy(false);
    }
  };

  const openSend = async () => {
    if (!row) return;
    if (!row.public_token) {
      const ok = await save({ public_token: newEvalToken() }, true);
      if (!ok) return;
    } else {
      await save({}, true);
    }
    setSending(true);
  };

  const exportPdf = async () => {
    if (!row) return;
    primeMobileDelivery();
    setExporting(true);
    try {
      const [raterPng, empPng] = await Promise.all([
        fetchPngBytes(row.rater_signature_url),
        fetchPngBytes(row.employee_signature_url),
      ]);
      const bytes = await generateEvalPdf({
        ...(row as never),
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

  return (
    <AppShell title="Performance Eval" showBack>
      <div className="space-y-4 p-4 pb-8">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4 card-shadow">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{value.subject_name || "Unnamed"}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {ratedFactorCount(value.ratings)} of 10 factors rated
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {needsRemarks && (
          <div className="rounded-xl bg-amber-500/10 p-3 text-[12px] font-medium text-amber-700">
            A rating of 0 or 1 requires written remarks before this eval is valid.
          </div>
        )}

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
              employeeUrl={row.employee_signature_url}
              raterName={value.rater_name}
              subjectName={value.subject_name}
              onRaterNameChange={(v) => patchValue({ rater_name: v })}
              onCapture={captureSignature}
              allowEmployee={!!row.rater_signature_url}
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
              onClick={openSend}
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {direction === "inbound_request" ? "Text the rater a link" : "Text for signature"}
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

      {row.public_token && (
        <SendEvalLinkSheet
          open={sending}
          onClose={() => setSending(false)}
          token={row.public_token}
          mode={direction === "inbound_request" ? "request" : "acknowledge"}
          subjectName={value.subject_name}
          fireName={value.fire_name}
        />
      )}
    </AppShell>
  );
}
