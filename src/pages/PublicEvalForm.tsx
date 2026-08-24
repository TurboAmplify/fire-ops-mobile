import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, AlertTriangle, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EvalBody } from "@/components/evals/EvalBody";
import { SignaturePicker } from "@/components/shift-tickets/SignaturePicker";
import type { EvalView } from "@/components/evals/EvalViewToggle";
import { EMPTY_EVAL_VALUE, toFormValue, type EvalFormValue } from "@/components/evals/types";
import { remarksRequired } from "@/lib/eval-225";
import fireLogo from "@/assets/fire-logo.png";

type Loaded = {
  direction: string;
  status: string;
  subject_name: string | null;
  fire_name: string | null;
} & Record<string, unknown>;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Public, no-login ICS-225 form reached from a texted link (/eval/:token).
 * All reads and writes go through the eval-form edge function.
 */
export default function PublicEvalForm() {
  const token = useMemo(() => {
    const parts = window.location.pathname.replace(/\/+$/, "").split("/");
    return parts[parts.length - 1] ?? "";
  }, []);

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [row, setRow] = useState<Loaded | null>(null);
  const [value, setValue] = useState<EvalFormValue>(EMPTY_EVAL_VALUE);
  // The recipient always sees the official ICS-225 layout.
  const [view, setView] = useState<EvalView>("traditional");
  const [signing, setSigning] = useState(false);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [sigBase64, setSigBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const isRaterFlow = row?.direction === "inbound_request";

  const call = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("eval-form", {
      body: { action, token, ...payload },
    });
    if (error) {
      let msg = "Something went wrong. Try again.";
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx) msg = (await ctx.clone().json())?.error ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, unknown>;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await call("get");
        const e = res.eval as Loaded;
        setRow(e);
        setValue(toFormValue(e as unknown as Record<string, unknown>));
        if (e.status === "complete") setDone(true);
      } catch (err) {
        setFatal((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = async () => {
    setBusy(true);
    try {
      await call("save", { value });
      toast.success("Progress saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!sigBase64) {
      toast.error("Please sign before submitting");
      return;
    }
    if (isRaterFlow && remarksRequired(value.ratings) && !value.remarks.trim()) {
      toast.error("A rating of 0 or 1 needs written remarks");
      return;
    }
    setBusy(true);
    try {
      await call("submit", {
        value,
        ...(isRaterFlow ? { rater_signature_png: sigBase64 } : { employee_signature_png: sigBase64 }),
      });
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const [{ generateEvalPdf }, { shareOrDownload, safeFilename, primeMobileDelivery }] = await Promise.all([
        import("@/lib/pdf-eval-225"),
        import("@/services/reports/exporters/share"),
      ]);
      primeMobileDelivery();
      const sigs = (await call("signatures")) as { rater?: string | null; employee?: string | null };
      const decode = (b64?: string | null) => {
        if (!b64) return null;
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      };
      const bytes = await generateEvalPdf({
        ...value,
        ratings: value.ratings,
        raterSignaturePng: decode(sigs.rater),
        employeeSignaturePng: decode(sigs.employee),
        rater_signed_date: (row?.rater_signed_date as string | null) ?? null,
        employee_signed_date: (row?.employee_signed_date as string | null) ?? null,
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
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-2xl bg-card p-6 text-center card-shadow">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-3 text-sm font-bold">{fatal}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ask whoever sent the link to send a new one.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background pb-[max(2rem,var(--app-safe-bottom))]">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <img src={fireLogo} alt="" className="h-8 w-8 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Incident Personnel Performance Rating</p>
            <p className="text-[11px] text-muted-foreground">
              ICS-225 · {row?.subject_name || "Crew member"}
              {row?.fire_name ? ` · ${row.fire_name}` : ""}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-2xl space-y-5 p-4">
          <div className="rounded-2xl bg-card p-4 text-center card-shadow">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="mt-3 text-base font-bold">Signed and complete</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review it below or save a copy of the official ICS-225 form.
            </p>
            <button
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
            >
              {pdfBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />} Download PDF
            </button>
          </div>

          <EvalBody
            view={view}
            onViewChange={setView}
            value={value}
            onChange={() => {}}
            lockSubject
            showRaterFields
            disabled
            lockView
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[max(2rem,var(--app-safe-bottom))]">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <img src={fireLogo} alt="" className="h-8 w-8 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Incident Personnel Performance Rating</p>
          <p className="text-[11px] text-muted-foreground">
            ICS-225 · {row?.subject_name || "Crew member"}
            {row?.fire_name ? ` · ${row.fire_name}` : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <div className="rounded-xl bg-secondary/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
          {isRaterFlow
            ? "This is the official ICS-225 form. Tap a cell to set a rating for each factor, add remarks, then sign at the bottom. Columns marked N/A were not selected for this rating."
            : "Review the rating below, then sign to confirm it was discussed with you."}
        </div>

        <EvalBody
          view={view}
          onViewChange={setView}
          value={value}
          onChange={(p) => setValue((prev) => ({ ...prev, ...p }))}
          lockSubject
          showRaterFields={isRaterFlow}
          disabled={!isRaterFlow}
          lockView
        />

        <div className="rounded-2xl bg-card p-4 card-shadow">
          <p className="text-sm font-bold">{isRaterFlow ? "Rater signature" : "Your signature"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isRaterFlow
              ? "Signing certifies this rating is yours."
              : "Signing confirms this rating has been discussed with you."}
          </p>
          {sigPreview && (
            <img
              src={sigPreview}
              alt="Signature"
              className="mt-3 h-16 w-full rounded-lg border border-border object-contain p-1"
              style={{ backgroundColor: "#ffffff" }}
            />
          )}
          <button
            type="button"
            onClick={() => setSigning(true)}
            className="mt-3 min-h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            {sigPreview ? "Re-sign" : "Sign here"}
          </button>
        </div>

        {isRaterFlow && (
          <button
            onClick={saveDraft}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Save and finish later
          </button>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Submit evaluation
        </button>
      </div>

      <SignaturePicker
        open={signing}
        title="Signature"
        defaultName={isRaterFlow ? (value.rater_name ?? "") : (row?.subject_name ?? "")}
        onClose={() => setSigning(false)}
        onSave={async (blob) => {
          setSigning(false);
          setSigPreview(URL.createObjectURL(blob));
          setSigBase64(await blobToBase64(blob));
        }}
      />
    </div>
  );
}
