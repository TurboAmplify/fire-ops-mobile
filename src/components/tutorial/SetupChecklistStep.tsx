import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Circle, Users, Truck, Siren } from "lucide-react";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useTrucks } from "@/hooks/useFleet";
import { useIncidents } from "@/hooks/useIncidents";
import { useTutorial } from "@/hooks/useTutorial";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ChecklistItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  helper: string;
  done: boolean;
  route: string;
}

export function SetupChecklistStep() {
  const navigate = useNavigate();
  const { minimize } = useTutorial();
  const { data: crew } = useCrewMembers();
  const { data: trucks } = useTrucks();
  const { data: incidents } = useIncidents();

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        id: "crew",
        icon: Users,
        iconColor: "text-violet-500",
        iconBg: "bg-violet-500/15",
        label: "Add your first crew member",
        helper: "Build your roster",
        done: (crew?.length ?? 0) > 0,
        route: "/crew",
      },
      {
        id: "truck",
        icon: Truck,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-500/15",
        label: "Add your first truck",
        helper: "Snap the VIN — AI fills the rest",
        done: (trucks?.length ?? 0) > 0,
        route: "/fleet/new",
      },
      {
        id: "incident",
        icon: Siren,
        iconColor: "text-destructive",
        iconBg: "bg-destructive/15",
        label: "Create your first incident",
        helper: "Then assign trucks and crew",
        done: (incidents?.length ?? 0) > 0,
        route: "/incidents/new",
      },
    ],
    [crew, trucks, incidents],
  );

  const completedCount = items.filter((i) => i.done).length;

  const handleGo = (route: string) => {
    minimize();
    navigate(route);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {completedCount} of {items.length} complete
        </p>
      </div>
      <div className="rounded-2xl border bg-card divide-y divide-border overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleGo(item.route)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/60 transition-colors touch-target"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  item.done ? "bg-emerald-500/15" : item.iconBg,
                )}
              >
                {item.done ? (
                  <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
                ) : (
                  <Icon className={cn("h-4 w-4", item.iconColor)} strokeWidth={2} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    item.done && "text-muted-foreground line-through",
                  )}
                >
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {item.done ? "Done" : item.helper}
                </p>
              </div>
              {item.done ? (
                <Circle className="h-4 w-4 text-transparent shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
