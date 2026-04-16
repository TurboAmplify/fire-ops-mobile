import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { Loader2, Flame, X } from "lucide-react";
import type { IncidentStatus } from "@/services/incidents";

export type IncidentAttachResult = {
  incidentId: string | null;
  incidentTruckId: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: IncidentAttachResult) => void;
}

type TabKey = IncidentStatus;
const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "demob", label: "Demob" },
  { key: "closed", label: "Closed" },
];

export function IncidentAttachSheet({ open, onOpenChange, onConfirm }: Props) {
  const { data: incidents, isLoading } = useIncidents();
  const [step, setStep] = useState<"ask" | "incident" | "truck">("ask");
  const [tab, setTab] = useState<TabKey>("active");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const { data: incidentTrucks, isLoading: trucksLoading } = useIncidentTrucks(selectedIncidentId ?? "");

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep("ask");
      setTab("active");
      setSelectedIncidentId(null);
    }
  }, [open]);

  const filtered = incidents?.filter((i) => (i.status as TabKey) === tab) ?? [];

  const handleNo = () => {
    onConfirm({ incidentId: null, incidentTruckId: null });
    onOpenChange(false);
  };

  const handlePickIncident = (id: string) => {
    setSelectedIncidentId(id);
    setStep("truck");
  };

  const handleSkipTruck = () => {
    if (!selectedIncidentId) return;
    onConfirm({ incidentId: selectedIncidentId, incidentTruckId: null });
    onOpenChange(false);
  };

  const handlePickTruck = (incidentTruckId: string) => {
    if (!selectedIncidentId) return;
    onConfirm({ incidentId: selectedIncidentId, incidentTruckId });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t p-0 max-h-[85vh] flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <SheetTitle className="text-lg font-bold">
            {step === "ask" && "Attach to an incident?"}
            {step === "incident" && "Pick an incident"}
            {step === "truck" && "Pick a truck (optional)"}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: ask */}
        {step === "ask" && (
          <div className="px-5 pb-8 pt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Link this expense to an incident so it shows up on incident totals.
            </p>
            <button
              onClick={() => setStep("incident")}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-bold active:bg-primary/90"
            >
              Yes, attach
            </button>
            <button
              onClick={handleNo}
              className="w-full h-14 rounded-2xl bg-secondary text-secondary-foreground text-base font-semibold active:bg-secondary/70"
            >
              No, save unattached
            </button>
          </div>
        )}

        {/* Step 2: pick incident */}
        {step === "incident" && (
          <>
            <div className="px-5 pb-2 flex gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 h-10 rounded-full text-sm font-semibold transition-colors ${
                    tab === t.key
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground active:bg-secondary/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
              {isLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} incidents.
                </div>
              )}
              <div className="space-y-2">
                {filtered.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => handlePickIncident(inc.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card card-shadow text-left active:bg-secondary/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Flame className="h-5 w-5 text-accent-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{inc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inc.location}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 pb-6 pt-2 border-t border-border/60">
              <button
                onClick={handleNo}
                className="w-full h-12 rounded-2xl bg-secondary text-secondary-foreground text-sm font-semibold active:bg-secondary/70"
              >
                Skip — save unattached
              </button>
            </div>
          </>
        )}

        {/* Step 3: pick truck */}
        {step === "truck" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
              {trucksLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!trucksLoading && (incidentTrucks?.length ?? 0) === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No trucks assigned to this incident.
                </div>
              )}
              <div className="space-y-2">
                {incidentTrucks?.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => handlePickTruck(it.id)}
                    className="w-full p-4 rounded-2xl bg-card card-shadow text-left active:bg-secondary/40 transition-colors"
                  >
                    <p className="font-semibold text-sm">{it.trucks.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 pb-6 pt-2 border-t border-border/60 space-y-2">
              <button
                onClick={handleSkipTruck}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:bg-primary/90"
              >
                Skip truck — attach to incident only
              </button>
              <button
                onClick={() => setStep("incident")}
                className="w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground active:text-foreground"
              >
                Back
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
