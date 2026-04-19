import { useTutorial } from "@/hooks/useTutorial";
import { Play, X } from "lucide-react";

export function TutorialMiniBar() {
  const { isMinimized, stepIndex, totalSteps, resume, close } = useTutorial();

  if (!isMinimized) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 animate-fade-in"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      <div className="flex items-center gap-1 rounded-full bg-foreground text-background shadow-lg shadow-foreground/20 pl-1 pr-1 py-1">
        <button
          onClick={resume}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full active:opacity-80 transition-opacity touch-target"
          aria-label="Resume tour"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/15">
            <Play className="h-3 w-3 fill-current" strokeWidth={0} />
          </span>
          <span className="text-xs font-semibold whitespace-nowrap">
            Resume tour · {stepIndex + 1}/{totalSteps}
          </span>
        </button>
        <button
          onClick={close}
          className="flex items-center justify-center h-7 w-7 rounded-full active:bg-background/15 transition-colors touch-target"
          aria-label="Close tour"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
