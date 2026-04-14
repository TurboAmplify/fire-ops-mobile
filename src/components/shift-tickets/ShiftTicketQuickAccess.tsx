import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2, ChevronRight, Flame, Truck as TruckIcon } from "lucide-react";
import { useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftTicketQuickAccess({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: recentTickets, isLoading: loadingRecent } = useRecentShiftTickets(5);
  const { data: incidents } = useIncidents();
  const [step, setStep] = useState<"home" | "pick-incident" | "pick-truck">("home");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const activeIncidents = incidents?.filter((i) => i.status === "active") ?? [];

  const handleTicketTap = (ticket: any) => {
    onOpenChange(false);
    navigate(`/incidents/${ticket.incident_truck_id}/trucks/${ticket.incident_truck_id}/shift-ticket/${ticket.id}`);
    // We need to navigate via incident_truck_id — but we need incident_id too.
    // The ticket has incident_truck_id. We'll navigate to the edit route directly.
    navigate(`/shift-ticket/${ticket.id}`);
  };

  const handlePickIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setStep("pick-truck");
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("home");
    setSelectedIncidentId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === "home" && "Shift Tickets"}
            {step === "pick-incident" && "Select Incident"}
            {step === "pick-truck" && "Select Truck"}
          </DialogTitle>
        </DialogHeader>

        {step === "home" && (
          <div className="space-y-4">
            {/* New Ticket button */}
            <button
              onClick={() => setStep("pick-incident")}
              className="flex w-full items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground text-left touch-target"
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold text-sm">New Shift Ticket</span>
            </button>

            {/* Recent tickets */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
                Recent Tickets
              </p>
              {loadingRecent && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingRecent && (!recentTickets || recentTickets.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No shift tickets yet</p>
              )}
              <div className="space-y-2">
                {recentTickets?.map((t) => {
                  const entries = (t.equipment_entries as any[]) || [];
                  const pEntries = (t.personnel_entries as any[]) || [];
                  const shiftDate = entries[0]?.date || pEntries[0]?.date || null;
                  const dateDisplay = shiftDate || new Date(t.updated_at).toLocaleDateString();
                  const label = [t.incident_name, t.equipment_type, dateDisplay].filter(Boolean).join(" - ") || "OF-297";
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTicketTap(t)}
                      className="flex w-full items-center gap-3 rounded-xl bg-card p-3 border border-border/20 text-left transition-transform active:scale-[0.98] touch-target"
                    >
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.status === "draft" ? "Draft" : "Final"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === "pick-incident" && (
          <div className="space-y-2">
            {activeIncidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active incidents</p>
            )}
            {activeIncidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => handlePickIncident(inc.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-card p-4 border border-border/20 text-left transition-transform active:scale-[0.98] touch-target"
              >
                <Flame className="h-4 w-4 text-destructive shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{inc.name}</p>
                  <p className="text-xs text-muted-foreground">{inc.location}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
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
            onBack={() => setStep("pick-incident")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TruckPicker({ incidentId, onSelect, onBack }: { incidentId: string; onSelect: (itId: string, incId: string) => void; onBack: () => void }) {
  const { data: trucks, isLoading } = useIncidentTrucks(incidentId);

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && (!trucks || trucks.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No trucks assigned to this incident</p>
      )}
      {trucks?.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id, incidentId)}
          className="flex w-full items-center gap-3 rounded-xl bg-card p-4 border border-border/20 text-left transition-transform active:scale-[0.98] touch-target"
        >
          <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{it.trucks.name}</p>
            {it.trucks.unit_type && <p className="text-xs text-muted-foreground">{it.trucks.unit_type}</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
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
