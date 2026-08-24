import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EvalTraditional } from "./EvalTraditional";
import type { EvalFormValue } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  value: EvalFormValue;
  /** Label for the confirm button, e.g. "Looks good — get the link". */
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * Read-only look at the official ICS-225 exactly as the recipient will see it,
 * shown before the link is texted or copied.
 */
export function EvalReviewDialog({ open, onClose, value, confirmLabel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,var(--app-safe-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>Review the eval</SheetTitle>
        </SheetHeader>

        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          This is exactly what the recipient sees. Categories you didn't select show as N/A. Close this to make changes.
        </p>

        <div className="mt-4">
          <EvalTraditional value={value} onChange={() => {}} disabled />
        </div>

        <div className="sticky bottom-0 mt-4 bg-background pt-2">
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {confirmLabel}
            {!busy && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
