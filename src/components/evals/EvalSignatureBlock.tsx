import { useState } from "react";
import { PenLine, Check } from "lucide-react";
import { SignatureCanvas } from "@/components/shift-tickets/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SigType = "rater" | "employee";

interface Props {
  raterUrl: string | null;
  employeeUrl: string | null;
  raterName: string;
  subjectName: string;
  onRaterNameChange?: (v: string) => void;
  onCapture: (type: SigType, blob: Blob) => void;
  /** Employee signature slot is hidden until the rater has signed. */
  allowEmployee: boolean;
  busy?: boolean;
}

function SigSlot({
  label,
  hint,
  url,
  onSign,
  disabled,
}: {
  label: string;
  hint: string;
  url: string | null;
  onSign: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 card-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        {url ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-bold text-success">
            <Check className="h-3 w-3" /> Signed
          </span>
        ) : null}
      </div>
      {url ? (
        <img
          src={url}
          alt={`${label} signature`}
          className="mt-3 h-16 w-full rounded-lg border border-border bg-background object-contain p-1"
        />
      ) : null}
      <button
        type="button"
        onClick={onSign}
        disabled={disabled}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        <PenLine className="h-4 w-4" /> {url ? "Re-sign" : "Sign here"}
      </button>
    </div>
  );
}

export function EvalSignatureBlock({
  raterUrl,
  employeeUrl,
  raterName,
  subjectName,
  onRaterNameChange,
  onCapture,
  allowEmployee,
  busy,
}: Props) {
  const [signing, setSigning] = useState<SigType | null>(null);

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

      <SigSlot
        label="Rater signature (block 13)"
        hint={raterName ? raterName : "The supervisor completing this rating."}
        url={raterUrl}
        disabled={busy}
        onSign={() => setSigning("rater")}
      />

      <SigSlot
        label="Employee signature (block 11)"
        hint={
          allowEmployee
            ? `${subjectName || "The person rated"} — "this rating has been discussed with me". Hand them the phone.`
            : "Available after the rater signs."
        }
        url={employeeUrl}
        disabled={busy || !allowEmployee}
        onSign={() => setSigning("employee")}
      />

      <SignatureCanvas
        open={signing !== null}
        title={signing === "employee" ? "Employee signature" : "Rater signature"}
        onClose={() => setSigning(null)}
        onSave={(blob) => {
          const t = signing;
          setSigning(null);
          if (t) onCapture(t, blob);
        }}
      />
    </div>
  );
}
