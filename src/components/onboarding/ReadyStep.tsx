import { CheckCircle2, ArrowRight } from "lucide-react";

interface ReadyStepProps {
  engineCount: number;
  crewCount: number;
  memberCount: number;
}

export function ReadyStep({ engineCount, crewCount, memberCount }: ReadyStepProps) {
  const hasAny = engineCount + crewCount + memberCount > 0;

  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold">You're ready to go</h2>
        <p className="text-sm text-muted-foreground">
          {hasAny
            ? "We've got you set up. You can finish profile details anytime from the Dashboard."
            : "You can add engines, crews, and people anytime from the Dashboard."}
        </p>
      </div>

      {hasAny && (
        <div className="rounded-xl bg-card border border-border/40 p-4 text-left space-y-2">
          {engineCount > 0 && (
            <p className="text-sm">
              <span className="font-semibold">{engineCount}</span>{" "}
              <span className="text-muted-foreground">{engineCount === 1 ? "engine" : "engines"} added</span>
            </p>
          )}
          {crewCount > 0 && (
            <p className="text-sm">
              <span className="font-semibold">{crewCount}</span>{" "}
              <span className="text-muted-foreground">{crewCount === 1 ? "crew" : "crews"} added</span>
            </p>
          )}
          {memberCount > 0 && (
            <p className="text-sm">
              <span className="font-semibold">{memberCount}</span>{" "}
              <span className="text-muted-foreground">crew {memberCount === 1 ? "member" : "members"} added</span>
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl bg-secondary/50 p-4 text-left space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended next steps</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            Complete engine details (VIN, plate, insurance)
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            Add roles and phone numbers for crew members
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            Upload agreements and set up daily checklists
          </li>
        </ul>
      </div>
    </div>
  );
}
