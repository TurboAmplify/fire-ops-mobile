import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/hooks/useTutorial";
import { TUTORIAL_STEPS } from "./tutorial-steps";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TutorialOverlay() {
  const { isOpen, stepIndex, totalSteps, close, next, back, complete } = useTutorial();
  const navigate = useNavigate();

  const step = TUTORIAL_STEPS[stepIndex];
  if (!step) return null;

  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const handleTakeMeThere = () => {
    if (step.route) {
      navigate(step.route);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl border-t max-h-[92vh] overflow-hidden flex flex-col w-full max-w-full"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Top bar: skip + progress */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {stepIndex + 1} / {totalSteps}
          </span>
          <button
            onClick={complete}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground active:text-foreground transition-colors px-2 py-1 -mr-2 touch-target"
            aria-label="Skip tutorial"
          >
            Skip
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-4 pb-4 shrink-0">
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="flex flex-col items-center text-center max-w-full">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl bg-accent mb-5")}>
              <Icon className={cn("h-8 w-8", step.iconColor)} strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2 break-words">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed break-words max-w-md">{step.body}</p>

            {step.route && step.ctaLabel && (
              <button
                onClick={handleTakeMeThere}
                className="mt-5 text-sm font-semibold text-primary active:text-primary/70 transition-colors px-3 py-2 touch-target"
              >
                {step.ctaLabel} →
              </button>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="border-t bg-card/50 px-4 py-3 flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={isFirst}
            className="flex-1 h-11 touch-target"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {isLast ? (
            <Button onClick={complete} size="sm" className="flex-[2] h-11 touch-target">
              <Check className="h-4 w-4 mr-1" />
              Got it
            </Button>
          ) : (
            <Button onClick={next} size="sm" className="flex-[2] h-11 touch-target">
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
