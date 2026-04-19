import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTutorial } from "@/hooks/useTutorial";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupChecklistStep } from "./SetupChecklistStep";

export function TutorialOverlay() {
  const {
    isOpen,
    stepIndex,
    totalSteps,
    steps,
    userFirstName,
    close,
    next,
    back,
    complete,
    minimize,
  } = useTutorial();
  const navigate = useNavigate();
  const [confirmSkip, setConfirmSkip] = useState(false);

  const step = steps[stepIndex];
  if (!step) return null;

  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  // Personalize the welcome step title if we have the user's first name.
  const displayTitle =
    step.id === "welcome" && userFirstName
      ? `Welcome, ${userFirstName}`
      : step.title;

  const handleTakeMeThere = () => {
    if (!step.route) return;
    // Minimize so the user can see the screen while the tour stays alive.
    minimize();
    navigate(step.route);
  };

  const handleSkipRequest = () => {
    setConfirmSkip(true);
  };

  const handleConfirmSkip = () => {
    setConfirmSkip(false);
    complete();
  };

  return (
    <>
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
          {/* Top bar: progress count + skip */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <button
              onClick={handleSkipRequest}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground active:text-foreground transition-colors px-2 py-1 -mr-2 touch-target"
              aria-label="Skip tutorial"
            >
              Skip
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4 shrink-0">
            <Progress value={progress} className="h-1" />
          </div>

          {/* Content (animated key swap) */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div
              key={step.id}
              className="flex flex-col items-center text-center max-w-full animate-fade-in"
            >
              {/* Hero: phone-frame screenshot with highlight, OR icon tile */}
              {step.screenshot ? (
                <>
                  <div
                    className={cn(
                      "relative w-full max-w-[200px] aspect-[9/19.5] rounded-[1.75rem] overflow-hidden mb-2 border-4 border-foreground/15 shadow-xl bg-background",
                    )}
                  >
                    <img
                      src={step.screenshot}
                      alt={`${step.title} screen preview`}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                      loading="lazy"
                    />
                    {step.highlight && (
                      <div
                        className="pointer-events-none absolute rounded-md ring-2 ring-primary animate-pulse"
                        style={{
                          top: step.highlight.top,
                          left: step.highlight.left,
                          width: step.highlight.width,
                          height: step.highlight.height,
                          boxShadow:
                            "0 0 0 9999px hsl(var(--background) / 0.55), 0 0 18px 2px hsl(var(--primary) / 0.6)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {step.highlight?.label && (
                    <p className="mb-4 text-[11px] font-medium text-primary uppercase tracking-wider">
                      {step.highlight.label}
                    </p>
                  )}
                </>
              ) : (
                <div
                  className={cn(
                    "relative flex h-28 w-full max-w-xs items-center justify-center rounded-3xl overflow-hidden mb-5 bg-gradient-to-br border",
                    step.gradient,
                  )}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm shadow-sm">
                    <Icon className={cn("h-8 w-8", step.iconColor)} strokeWidth={1.75} />
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold tracking-tight mb-2 break-words">
                {displayTitle}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed break-words max-w-md">
                {step.body}
              </p>

              {/* Bullets */}
              {step.bullets && step.bullets.length > 0 && (
                <ul className="mt-4 w-full max-w-md space-y-2 text-left">
                  {step.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-[13px] leading-snug"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          "bg-secondary",
                        )}
                      >
                        <Check className="h-2.5 w-2.5 text-foreground" strokeWidth={3} />
                      </span>
                      <span className="text-foreground/90">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Pro tip */}
              {step.proTip && (
                <div className="mt-4 w-full max-w-md rounded-xl bg-primary/8 border border-primary/15 px-3.5 py-2.5 text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.25} />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Pro tip
                    </span>
                  </div>
                  <p className="text-[12px] leading-snug text-foreground/85">
                    {step.proTip}
                  </p>
                </div>
              )}

              {/* Interactive checklist (final step) */}
              {step.kind === "checklist" && (
                <div className="mt-5 w-full">
                  <SetupChecklistStep />
                </div>
              )}

              {/* Take-me-there CTA */}
              {step.route && step.ctaLabel && step.kind !== "checklist" && (
                <button
                  onClick={handleTakeMeThere}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary active:text-primary/70 transition-colors px-3 py-2 touch-target"
                >
                  {step.ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
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

      {/* Skip confirmation */}
      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip the tour?</AlertDialogTitle>
            <AlertDialogDescription>
              You can replay it anytime from the help icon on the Dashboard or
              from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep watching</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkip}>
              Skip tour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
