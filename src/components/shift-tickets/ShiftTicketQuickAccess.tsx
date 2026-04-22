import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2, ChevronRight, Flame, Truck as TruckIcon, History } from "lucide-react";
import { useLatestTicketPerTruck, useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { getLocalDateString } from "@/lib/local-date";
import { Badge } from "@/components/ui/badge";
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

/** Format a YYYY-MM-DD string for display without UTC shift */
function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${parseInt(m)}/${parseInt(d)}`;
}

function getTicketDate(t: any): string {
  const entries = (t.equipment_entries as any[]) || [];
  const pEntries = (t.personnel_entries as any[]) || [];
  const shiftDate = entries[0]?.date || pEntries[0]?.date || null;
  return shiftDate || t.updated_at?.split("T")[0] || "";
}

/** Relative label for shift dates: Today / Yesterday / "X days ago" / formatted date */
function relativeDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const today = getLocalDateString();
  if (dateStr === today) return "Today";
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  if (!ty || !dy) return fmtDate(dateStr);
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(dy, dm - 1, dd)) / 86_400_000
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return fmtDate(dateStr);
}

export function ShiftTicketQuickAccess({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: latestPerTruck, isLoading: loadingLatest } = useLatestTicketPerTruck();
  const { data: incidents } = useIncidents();
  const [step, setStep] = useState<"home" | "history" | "pick-incident" | "pick-truck">("home");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const activeIncidents = incidents?.filter((i) => i.status === "active") ?? [];

  const handleTicketTap = (ticket: any) => {
    const incidentId = ticket.incident_trucks?.incident_id;
    if (!incidentId) return;
    handleClose();
    navigate(`/incidents/${incidentId}/trucks/${ticket.incident_truck_id}/shift-ticket/${ticket.id}`);
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
            {step === "history" && "All Tickets"}
            {step === "pick-incident" && "Select Incident"}
            {step === "pick-truck" && "Select Truck"}
          </DialogTitle>
        </DialogHeader>

        {step === "home" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("pick-incident")}
              className="flex w-full items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground text-left touch-target"
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold text-sm">New Shift Ticket</span>
            </button>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
                Latest by Truck
              </p>
              {loadingLatest && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingLatest && (!latestPerTruck || latestPerTruck.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No shift tickets yet</p>
              )}
              <div className="space-y-2">
                {latestPerTruck?.map((t) => {
                  const truckName = t.incident_trucks?.trucks?.name ?? t.equipment_type ?? "Truck";
                  const dateStr = getTicketDate(t);
                  const dateDisplay = relativeDateLabel(dateStr);
                  const isToday = dateStr === getLocalDateString();
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTicketTap(t)}
                      className="flex w-full items-center gap-3 rounded-xl bg-card p-3 border border-border/20 text-left transition-transform active:scale-[0.98] touch-target"
                    >
                      <TruckIcon className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{truckName}</p>
                          {isToday && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-primary shrink-0">Today</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[t.incident_name, dateDisplay].filter(Boolean).join(" - ")}
                        </p>
                      </div>
                      <Badge variant={t.status === "draft" ? "secondary" : "default"} className="text-[9px] shrink-0">
                        {t.status === "draft" ? "Draft" : "Final"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {latestPerTruck && latestPerTruck.length > 0 && (
              <button
                onClick={() => setStep("history")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/30 p-3 text-sm text-muted-foreground transition-transform active:scale-[0.98] touch-target"
              >
                <History className="h-4 w-4" />
                View All Tickets
              </button>
            )}
          </div>
        )}

        {step === "history" && <HistoryList onTap={handleTicketTap} onBack={() => setStep("home")} />}

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

function HistoryList({ onTap, onBack }: { onTap: (t: any) => void; onBack: () => void }) {
  const { data: tickets, isLoading } = useRecentShiftTickets(25);

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && (!tickets || tickets.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No tickets found</p>
      )}
      {tickets?.map((t) => {
        const truckName = t.incident_trucks?.trucks?.name ?? t.equipment_type ?? "Truck";
        const dateStr = getTicketDate(t);
        const dateDisplay = relativeDateLabel(dateStr);
        return (
          <button
            key={t.id}
            onClick={() => onTap(t)}
            className="flex w-full items-center gap-3 rounded-xl bg-card p-3 border border-border/20 text-left transition-transform active:scale-[0.98] touch-target"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{truckName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {[t.incident_name, dateDisplay].filter(Boolean).join(" - ")}
              </p>
            </div>
            <Badge variant={t.status === "draft" ? "secondary" : "default"} className="text-[9px] shrink-0">
              {t.status === "draft" ? "Draft" : "Final"}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
          </button>
        );
      })}
      <button
        onClick={onBack}
        className="w-full text-center text-sm text-muted-foreground py-2 touch-target"
      >
        Back
      </button>
    </div>
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
