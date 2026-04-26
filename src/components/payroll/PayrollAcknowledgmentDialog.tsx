import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * One-time-per-(org,user) acknowledgment that the payroll module is an
 * estimation tool, not a licensed payroll service or tax advice.
 *
 * The dialog is non-dismissable until the user taps "I Understand".
 * Acceptance is stored in localStorage so each admin sees it exactly once
 * per organization they administer.
 */
const STORAGE_PREFIX = "payroll_disclaimer_ack:";

interface Props {
  orgId: string | undefined;
  userId: string | undefined;
}

export function PayrollAcknowledgmentDialog({ orgId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const storageKey = orgId && userId ? `${STORAGE_PREFIX}${orgId}:${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const accepted = localStorage.getItem(storageKey);
      if (!accepted) setOpen(true);
    } catch {
      // localStorage unavailable — fail open (don't block payroll)
    }
  }, [storageKey]);

  const accept = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // ignore — still let the user proceed
      }
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block dismiss-by-overlay-tap or escape — must explicitly accept
        if (!next) return;
        setOpen(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <DialogTitle>Payroll is an estimation tool</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-left text-sm leading-relaxed">
            FireOps HQ payroll calculates gross pay, withholdings, and paystubs
            for <strong>operational planning only</strong>. It is{" "}
            <strong>not a licensed payroll service</strong> and{" "}
            <strong>not tax advice</strong>.
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground leading-snug">
          <li>
            Withholding percentages are simplified flat rates, <strong>not</strong>{" "}
            IRS Publication 15-T tax tables.
          </li>
          <li>
            Paystubs do <strong>not</strong> replace W-2s, 1099s, Form 941, or any
            state filing.
          </li>
          <li>
            You remain responsible for filing taxes through a CPA or licensed
            payroll provider.
          </li>
          <li>
            FireOps HQ is not liable for filing errors, penalties, or audit
            findings arising from these estimates.
          </li>
        </ul>

        <button
          onClick={accept}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] touch-target"
        >
          I Understand — Continue
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          See Terms of Use → "Payroll & Tax Estimation" for the full disclaimer.
        </p>
      </DialogContent>
    </Dialog>
  );
}
