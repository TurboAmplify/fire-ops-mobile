import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, ChevronRight, Flame, Truck as TruckIcon, History, FileText } from "lucide-react";
import { useLatestTicketPerTruck } from "@/hooks/useShiftTickets";
import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { getLocalDateString } from "@/lib/local-date";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getTicketDate(t: any): string {
  const entries = (t.equipment_entries as any[]) || [];
  const pEntries = (t.personnel_entries as any[]) || [];
  const shiftDate = entries[0]?.date || pEntries[0]?.date || null;
  return shiftDate || t.updated_at?.split("T")[0] || "";
}

/**
 * Quick-access action sheet for shift tickets, opened from the bottom nav.
 * World-class pattern: action-first (big "Start New" CTA), then today's
 * open drafts only, then a single link to the full log. Not a list browser.
 */
export function ShiftTicketQuickAccess({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: latestPerTruck, isLoading: loadingLatest } = useLatestTicketPerTruck();
  const { data: incidents } = useIncidents();
  const [step, setStep] = useState<"home" | "pick-incident" | "pick-truck">("home");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const activeIncidents = incidents?.filter((i) => i.status === "active") ?? [];
  const today = getLocalDateString();
  // Show only today's tickets (the things you'd actually want to resume)
  const todaysTickets = (latestPerTruck ?? []).filter((t) => getTicketDate(t) === today);

  const handleClose = () => {
    onOpenChange(false);
    // small delay so the closing animation looks clean before resetting state
    setTimeout(() => {
      setStep("home");
      setSelectedIncidentId(null);
    }, 200);
  };

  const handleTicketTap = (ticket: any) => {
    const incidentId = ticket.incident_trucks?.incident_id;
    if (!incidentId) return;
    handleClose();
    navigate(`/incidents/${incidentId}/trucks/${ticket.incident_truck_id}/shift-ticket/${ticket.id}`);
  };

  const handleStartNew = () => {
    if (activeIncidents.length === 0) return;
    if (activeIncidents.length === 1) {
      setSelectedIncidentId(activeIncidents[0].id);
      setStep("pick-truck");
      return;
    }
    setStep("pick-incident");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            {step === "home" && "Shift Tickets"}
            {step === "pick-incident" && "Select Incident"}
            {step === "pick-truck" && "Select Truck"}
          </SheetTitle>
        </SheetHeader>

        {step === "home" && (
          <div className="mt-4 space-y-5 pb-4">
            {/* Primary action — big and obvious */}
            <button
              onClick={handleStartNew}
              disabled={activeIncidents.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
              Start New Shift Ticket
            </button>

            {activeIncidents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                No active incidents. Create one to start a ticket.
              </p>
            )}

            {/* Continue Today — only today's tickets */}
            {loadingLatest && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingLatest && todaysTickets.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Continue Today
                </p>
                <div className="space-y-2">
                  {todaysTickets.map((t) => {
                    const truckName = t.incident_trucks?.trucks?.unit_type ?? t.incident_trucks?.trucks?.name ?? t.equipment_type ?? "Truck";
                    const isDraft = !t.supervisor_signature_url;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTicketTap(t)}
                        className="relative flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-3 text-left card-shadow active:scale-[0.99] transition-transform touch-target"
                      >
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate pr-16">{truckName}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {t.incident_name || ""}
                          </p>
                        </div>
                        <span
                          className={`absolute right-3 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isDraft
                              ? "bg-muted text-muted-foreground"
                              : "bg-green-500/15 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {isDraft ? "Draft" : "Complete"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* View all — single link, not an inline browser */}
            <button
              onClick={() => {
                handleClose();
                navigate("/shift-tickets/log");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/30 py-3 text-sm font-medium text-muted-foreground active:scale-[0.99] transition-transform touch-target"
            >
              <History className="h-4 w-4" />
              View All Tickets
            </button>
          </div>
        )}

        {step === "pick-incident" && (
          <div className="mt-4 space-y-2 pb-4">
            {activeIncidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active incidents</p>
            )}
            {activeIncidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => {
                  setSelectedIncidentId(inc.id);
                  setStep("pick-truck");
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-4 text-left active:scale-[0.99] transition-transform touch-target"
              >
                <Flame className="h-4 w-4 text-destructive shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{inc.name}</p>
                  <p className="text-xs text-muted-foreground">{inc.location}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
            <button
              onClick={() => setStep("home")}
              className="w-full text-center text-sm text-muted-foreground py-2 touch-target"
            >
              Back
            </button>
          </div>
        )}

        {step === "pick-truck" && selectedIncidentId && (
          <TruckPicker
            incidentId={selectedIncidentId}
            onSelect={(itId, incId) => {
              handleClose();
              navigate(`/incidents/${incId}/trucks/${itId}/shift-ticket/new`);
            }}
            onBack={() => {
              if (activeIncidents.length === 1) {
                setStep("home");
              } else {
                setStep("pick-incident");
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TruckPicker({
  incidentId,
  onSelect,
  onBack,
}: {
  incidentId: string;
  onSelect: (itId: string, incId: string) => void;
  onBack: () => void;
}) {
  const { data: trucks, isLoading } = useIncidentTrucks(incidentId);

  // If only one truck, jump straight through
  if (!isLoading && trucks?.length === 1) {
    onSelect(trucks[0].id, incidentId);
    return null;
  }

  return (
    <div className="mt-4 space-y-2 pb-4">
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && (!trucks || trucks.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No trucks assigned to this incident
        </p>
      )}
      {trucks?.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id, incidentId)}
          className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-4 text-left active:scale-[0.99] transition-transform touch-target"
        >
          <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{it.trucks.name}</p>
            {it.trucks.unit_type && (
              <p className="text-xs text-muted-foreground">{it.trucks.unit_type}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </button>
      ))}
      <button
        onClick={onBack}
        className="w-full text-center text-sm text-muted-foreground py-2 touch-target"
      >
        Back
      </button>
    </div>
  );
}
