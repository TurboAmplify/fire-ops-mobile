import { useState } from "react";
import { PenLine, Check } from "lucide-react";
import { SignaturePicker } from "@/components/shift-tickets/SignaturePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SigType = "rater";

interface Props {
  raterUrl: string | null;
  raterName: string;
  onRaterNameChange?: (v: string) => void;
  onCapture: (type: SigType, blob: Blob) => void;
  busy?: boolean;
}

/** Only the evaluator (rater) signs an ICS-225 in this app. */
export function EvalSignatureBlock({
  raterUrl,
  raterName,
  onRaterNameChange,
  onCapture,
  busy,
}: Props) {
  const [signing, setSigning] = useState(false);

  return (
    <div className="space-y-3">
      {onRaterNameChange && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            13. Rated by (printed name)
          </Label>
          <Input
            value={raterName}
            onChange={(e) => onRaterNameChange(e.target.value)}
            placeholder="Rater's full name"
            className="h-12 text-base"
          />
        </div>
      )}

      <div className="rounded-2xl bg-card p-4 card-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">Evaluator signature (block 13)</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {raterName || "The supervisor completing this rating."}
            </p>
          </div>
          {raterUrl ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-bold text-success">
              <Check className="h-3 w-3" /> Signed
            </span>
          ) : null}
        </div>
        {raterUrl ? (
          <img
            src={raterUrl}
            alt="Evaluator signature"
            className="mt-3 h-16 w-full rounded-lg border border-border object-contain p-1"
            style={{ backgroundColor: "#ffffff" }}
          />
        ) : null}
        <button
          type="button"
          onClick={() => setSigning(true)}
          disabled={busy}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <PenLine className="h-4 w-4" /> {raterUrl ? "Re-sign" : "Sign here"}
        </button>
      </div>

      <SignaturePicker
        open={signing}
        title="Evaluator signature"
        defaultName={raterName}
        onClose={() => setSigning(false)}
        onSave={(blob) => {
          setSigning(false);
          onCapture("rater", blob);
        }}
      />
    </div>
  );
}
