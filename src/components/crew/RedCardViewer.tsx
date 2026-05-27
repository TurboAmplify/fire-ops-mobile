import { useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { RedCardCard } from "@/components/crew/RedCardCard";
import type { RedCard } from "@/services/red-cards";

interface Props {
  card: RedCard;
  memberName: string;
  onClose: () => void;
}

/**
 * Full-screen Red Card viewer. Sits above the Crew Detail sheet so closing it
 * returns the user to the crew profile, not all the way back to the list.
 */
export function RedCardViewer({ card, memberName, onClose }: Props) {
  // Lock scroll + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-background flex flex-col animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${memberName} Red Card`}
    >
      {/* Top bar */}
      <div
        className="shrink-0 border-b border-border bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-primary touch-target active:scale-[0.97] transition-transform"
            aria-label="Back to crew member"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>
          <h2 className="text-sm font-bold text-center truncate">{memberName}</h2>
          <button
            onClick={onClose}
            className="touch-target p-2"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-lg p-4">
          <RedCardCard card={card} memberName={memberName} />
        </div>
      </div>
    </div>
  );
}
