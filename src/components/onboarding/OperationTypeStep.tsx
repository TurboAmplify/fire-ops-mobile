import { Check, Flame, Users, Layers } from "lucide-react";
import type { OperationType } from "@/lib/operation-type";

interface OperationTypeStepProps {
  value: OperationType;
  onChange: (v: OperationType) => void;
}

const OPTIONS: Array<{
  value: OperationType;
  title: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    value: "engine",
    title: "Engine-based",
    desc: "You run trucks (engines) on incidents — Type 6, water tenders, etc.",
    icon: Flame,
  },
  {
    value: "hand_crew",
    title: "Hand crew-based",
    desc: "You dispatch hand crews on the line. No trucks tracked here.",
    icon: Users,
  },
  {
    value: "both",
    title: "Both",
    desc: "Mixed operation — engines and hand crews working together.",
    icon: Layers,
  },
];

export function OperationTypeStep({ value, onChange }: OperationTypeStepProps) {
  return (
    <div className="space-y-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex w-full items-start gap-3 rounded-xl p-4 border text-left transition-all touch-target ${
              selected ? "bg-primary/10 border-primary/50" : "bg-card border-border/40 active:scale-[0.99]"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                selected ? "bg-primary/20" : "bg-accent"
              }`}
            >
              <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-accent-foreground"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${selected ? "font-bold" : "font-semibold"}`}>{opt.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
            {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
