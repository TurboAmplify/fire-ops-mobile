import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Sparkles, X, Upload } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { uploadShiftTicketImport, parseShiftTicketAI, type ParsedShiftTicket } from "@/services/shift-ticket-import";

interface Props {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  /** Called when the user taps "Apply" on the parse result. */
  onApply: (parsed: ParsedShiftTicket, mode: "fill-empty" | "replace") => void;
}

const FIELD_LABELS: Array<{ key: keyof ParsedShiftTicket; label: string }> = [
  { key: "agreement_number", label: "Agreement #" },
  { key: "contractor_name", label: "Contractor" },
  { key: "resource_order_number", label: "Resource Order #" },
  { key: "incident_name", label: "Incident" },
  { key: "incident_number", label: "Incident #" },
  { key: "financial_code", label: "Financial Code" },
  { key: "equipment_make_model", label: "Make/Model" },
  { key: "equipment_type", label: "Equipment Type" },
  { key: "serial_vin_number", label: "VIN" },
  { key: "license_id_number", label: "License/ID" },
  { key: "contractor_rep_name", label: "Contractor Rep" },
  { key: "supervisor_name", label: "Supervisor" },
];

export function ShiftTicketImportSheet({ open, onClose, organizationId, onApply }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"pick" | "uploading" | "parsing" | "review">("pick");
  const [parsed, setParsed] = useState<ParsedShiftTicket | null>(null);
  const [mode, setMode] = useState<"fill-empty" | "replace">("fill-empty");

  const reset = () => {
    setStage("pick");
    setParsed(null);
    setMode("fill-empty");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (stage === "uploading" || stage === "parsing") return;
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!organizationId) {
      toast.error("Organization not loaded yet");
      return;
    }
    // 10MB sanity cap to keep AI calls fast in poor signal
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB). Try a photo instead of a PDF.");
      return;
    }
    setStage("uploading");
    try {
      const fileUrl = await uploadShiftTicketImport(file, organizationId);
      setStage("parsing");
      const result = await parseShiftTicketAI(fileUrl, file.name);
      setParsed(result);
      setStage("review");
    } catch (err) {
      console.error("Shift ticket import failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import shift ticket");
      reset();
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed, mode);
    toast.success("Imported — review the form before saving.");
    reset();
    onClose();
  };

  const eqRows = parsed?.equipment_entries?.filter((r) => r && (r.date || r.start || r.stop)) ?? [];
  const peRows = parsed?.personnel_entries?.filter((r) => r && (r.operator_name || r.op_start || r.op_stop)) ?? [];

  const hasAnyHeader = parsed
    ? FIELD_LABELS.some(({ key }) => {
        const v = parsed[key];
        return typeof v === "string" && v.trim().length > 0;
      })
    : false;

  return (
    <Drawer open={open} onOpenChange={(v) => !v && handleClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Import shift ticket
          </DrawerTitle>
          <button
            type="button"
            onClick={handleClose}
            disabled={stage === "uploading" || stage === "parsing"}
            className="touch-target rounded-lg p-1 text-muted-foreground active:bg-accent disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {stage === "pick" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Take a photo or pick an image of an existing OF-297 shift ticket. We'll extract the
                fields with AI so you don't have to retype them.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-4 text-center touch-target active:bg-accent/40">
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold">Take photo</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>

                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-4 text-center touch-target active:bg-accent/40">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold">Choose file</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Tip: shoot in good light with the whole form visible. AI extraction works best on flat,
                non-glare images. Nothing is saved to records — the photo is only used to fill in the
                form.
              </p>
            </div>
          )}

          {(stage === "uploading" || stage === "parsing") && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {stage === "uploading" ? "Uploading..." : "Reading shift ticket with AI..."}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                This usually takes 5–15 seconds. Don't close the app.
              </p>
            </div>
          )}

          {stage === "review" && parsed && (
            <div className="space-y-4">
              {!hasAnyHeader && eqRows.length === 0 && peRows.length === 0 ? (
                <div className="rounded-xl bg-warning/10 border border-warning/30 p-3">
                  <p className="text-sm font-medium text-warning">
                    Couldn't read any fields. Try a clearer photo or fill the form manually.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Review what we extracted. Tap Apply to fill the form.
                </p>
              )}

              {hasAnyHeader && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Header
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {FIELD_LABELS.map(({ key, label }) => {
                      const v = parsed[key];
                      if (typeof v !== "string" || !v.trim()) return null;
                      return (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{label}: </span>
                          <span className="font-medium">{v}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {eqRows.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Equipment ({eqRows.length})
                  </p>
                  <div className="space-y-1">
                    {eqRows.map((r, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{r.date || "—"}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.start || "—"}–{r.stop || "—"} · {r.type || "Day"}
                          {r.quantity ? ` × ${r.quantity}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {peRows.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Personnel ({peRows.length})
                  </p>
                  <div className="space-y-1">
                    {peRows.map((r, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{r.operator_name || "—"}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.op_start || "—"}–{r.op_stop || "—"}
                          {r.sb_start || r.sb_stop ? ` · SB ${r.sb_start || "—"}–${r.sb_stop || "—"}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(hasAnyHeader || eqRows.length > 0 || peRows.length > 0) && (
                <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Apply mode
                  </p>
                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="radio"
                      name="apply-mode"
                      checked={mode === "fill-empty"}
                      onChange={() => setMode("fill-empty")}
                      className="mt-0.5 touch-target"
                    />
                    <span>
                      <span className="font-semibold">Only fill empty fields</span>
                      <span className="block text-muted-foreground">
                        Safer — keeps anything you already typed.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="radio"
                      name="apply-mode"
                      checked={mode === "replace"}
                      onChange={() => setMode("replace")}
                      className="mt-0.5 touch-target"
                    />
                    <span>
                      <span className="font-semibold">Replace everything</span>
                      <span className="block text-muted-foreground">
                        Overwrites all fields and rows with what was extracted.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1 touch-target">
                  Try again
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!hasAnyHeader && eqRows.length === 0 && peRows.length === 0}
                  className="flex-1 touch-target"
                >
                  Apply to form
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
