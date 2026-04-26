import { ChipInput } from "@/components/onboarding/ChipInput";
import { User } from "lucide-react";

interface QuickCrewMembersStepProps {
  memberNames: string[];
  onMemberNamesChange: (next: string[]) => void;
}

export function QuickCrewMembersStep({ memberNames, onMemberNamesChange }: QuickCrewMembersStepProps) {
  return (
    <section className="rounded-xl bg-card border border-border/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <User className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Add crew members</h3>
          <p className="text-[11px] text-muted-foreground">Optional — names only, role and contact later</p>
        </div>
      </div>
      <ChipInput
        value={memberNames}
        onChange={onMemberNamesChange}
        placeholder="e.g. Jane Smith"
        ariaLabel="Crew member name"
        hint="Skip this if you'd rather add people from the Crew screen later."
      />
    </section>
  );
}
