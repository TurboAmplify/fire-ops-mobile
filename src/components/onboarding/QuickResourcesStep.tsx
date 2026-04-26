import { ChipInput } from "@/components/onboarding/ChipInput";
import { Truck, Users } from "lucide-react";
import { showsEngines, showsHandCrews, type OperationType } from "@/lib/operation-type";

interface QuickResourcesStepProps {
  operationType: OperationType;
  engineNames: string[];
  onEngineNamesChange: (next: string[]) => void;
  crewNames: string[];
  onCrewNamesChange: (next: string[]) => void;
}

export function QuickResourcesStep({
  operationType,
  engineNames,
  onEngineNamesChange,
  crewNames,
  onCrewNamesChange,
}: QuickResourcesStepProps) {
  return (
    <div className="space-y-6">
      {showsEngines(operationType) && (
        <section className="rounded-xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Add your engines</h3>
              <p className="text-[11px] text-muted-foreground">Just the identifier — details come later</p>
            </div>
          </div>
          <ChipInput
            value={engineNames}
            onChange={onEngineNamesChange}
            placeholder="e.g. DL31"
            ariaLabel="Engine identifier"
            hint="Add as many as you want. You can finish each engine's profile (VIN, plate, insurance) later."
          />
        </section>
      )}

      {showsHandCrews(operationType) && (
        <section className="rounded-xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
              <Users className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Add your hand crews</h3>
              <p className="text-[11px] text-muted-foreground">Just a name — assign people later</p>
            </div>
          </div>
          <ChipInput
            value={crewNames}
            onChange={onCrewNamesChange}
            placeholder="e.g. Crew 7"
            ariaLabel="Crew name"
            hint="You can assign individual crew members to each crew on the next step or later."
          />
        </section>
      )}
    </div>
  );
}
