import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, ChevronRight, ChevronLeft, Flame, Truck as TruckIcon, History, FileText, Search, Camera } from "lucide-react";
import { useLatestTicketPerTruck, useShiftTickets } from "@/hooks/useShiftTickets";
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

function fmtRelative(dateStr: string): string {
  if (!dateStr) return "";
  const today = getLocalDateString();
  if (dateStr === today) return "Today";
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  if (!ty || !dy) return dateStr;
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(dy, dm - 1, dd)) / 86_400_000
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function ticketStatusBadge(t: any): { label: string; cls: string } {
  if (t.supervisor_signature_url) return { label: "Complete", cls: "bg-green-500/15 text-green-700 dark:text-green-400" };
  if (t.contractor_rep_signature_url) return { label: "Awaiting Sup.", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (t.status && t.status !== "draft") return { label: "Submitted", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Draft", cls: "bg-muted text-muted-foreground" };
}

// Mode: "new" walks user through creating a ticket. "browse" walks user
// through finding an existing ticket. We keep them on separate step machines
// so they can never accidentally cross-route (e.g. browse landing on /new).
type Mode = "new" | "browse" | "import";
type Step =
  | "home"
  | "pick-incident"
  | "pick-truck"
  | "browse-tickets";

/**
 * Quick-access action sheet for shift tickets, opened from the bottom nav and
 * the Dashboard "Shift Ticket" quick action. Two paths:
 *
 *  1. Start New — primary CTA, walks Incident → Truck → /new ticket form
 *  2. Browse by Truck — Incident → Truck → in-sheet ticket list, tap to open
 *
 * The full sortable log is still one tap away via "View All Tickets".
 */
export function ShiftTicketQuickAccess({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: latestPerTruck, isLoading: loadingLatest } = useLatestTicketPerTruck();
  const { data: incidents } = useIncidents();
  const [mode, setMode] = useState<Mode>("new");
  const [step, setStep] = useState<Step>("home");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<{ itId: string; name: string } | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const visibleIncidents = (incidents ?? []).filter((i) =>
    showClosed ? true : i.status === "active"
  );
  const activeIncidents = (incidents ?? []).filter((i) => i.status === "active");
  const today = getLocalDateString();
  const todaysTickets = (latestPerTruck ?? []).filter((t) => getTicketDate(t) === today);

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("home");
      setMode("new");
      setSelectedIncidentId(null);
      setSelectedTruck(null);
      setShowClosed(false);
    }, 200);
  };

  const handleTicketTap = (ticket: any) => {
    const incidentId = ticket.incident_trucks?.incident_id ?? selectedIncidentId;
    if (!incidentId) return;
    resetAndClose();
    navigate(`/incidents/${incidentId}/trucks/${ticket.incident_truck_id}/shift-ticket/${ticket.id}`);
  };

  const handleStartNew = () => {
    setMode("new");
    if (activeIncidents.length === 0) return;
    if (activeIncidents.length === 1) {
      setSelectedIncidentId(activeIncidents[0].id);
      setStep("pick-truck");
      return;
    }
    setStep("pick-incident");
  };

  const handleStartImport = () => {
    setMode("import");
    if (activeIncidents.length === 0) return;
    if (activeIncidents.length === 1) {
      setSelectedIncidentId(activeIncidents[0].id);
      setStep("pick-truck");
      return;
    }
    setStep("pick-incident");
  };

  const handleBrowse = () => {
    setMode("browse");
    if (visibleIncidents.length === 1) {
      setSelectedIncidentId(visibleIncidents[0].id);
      setStep("pick-truck");
      return;
    }
    setStep("pick-incident");
  };

  // Truck-pick handler differs by mode
  const handleTruckPicked = (itId: string, incId: string, truckLabel: string) => {
    if (mode === "new") {
      resetAndClose();
      navigate(`/incidents/${incId}/trucks/${itId}/shift-ticket/new`);
      return;
    }
    setSelectedTruck({ itId, name: truckLabel });
    setStep("browse-tickets");
  };

  const goBackFromTruck = () => {
    const list = mode === "browse" ? visibleIncidents : activeIncidents;
    if (list.length === 1) {
      setStep("home");
    } else {
      setStep("pick-incident");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : resetAndClose())}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            {step === "home" && "Shift Tickets"}
            {step === "pick-incident" && (mode === "new" ? "Select Incident" : "Browse — Select Incident")}
            {step === "pick-truck" && (mode === "new" ? "Select Truck" : "Browse — Select Truck")}
            {step === "browse-tickets" && (selectedTruck?.name ?? "Tickets")}
          </SheetTitle>
        </SheetHeader>

        {step === "home" && (
          <div className="mt-4 space-y-5 pb-4">
            {/* Primary action — unchanged */}
            <button
              onClick={handleStartNew}
              disabled={activeIncidents.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
              Start New Shift Ticket
            </button>

            {/* Secondary: browse existing tickets by truck */}
            <button
              onClick={handleBrowse}
              disabled={(incidents?.length ?? 0) === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card py-3 text-sm font-semibold text-foreground active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
            >
              <Search className="h-4 w-4" />
              Browse by Truck
            </button>

            {activeIncidents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                No active incidents. Create one to start a ticket.
              </p>
            )}

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

            <button
              onClick={() => {
                resetAndClose();
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
            {mode === "browse" && (incidents?.some((i) => i.status !== "active") ?? false) && (
              <button
                onClick={() => setShowClosed((v) => !v)}
                className="w-full text-center text-xs text-primary py-1.5 touch-target"
              >
                {showClosed ? "Show active only" : "Show closed incidents too"}
              </button>
            )}
            {visibleIncidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {mode === "browse" ? "No incidents available" : "No active incidents"}
              </p>
            )}
            {visibleIncidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => {
                  setSelectedIncidentId(inc.id);
                  setStep("pick-truck");
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-4 text-left active:scale-[0.99] transition-transform touch-target"
              >
                <Flame className={`h-4 w-4 shrink-0 ${inc.status === "active" ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{inc.name}</p>
                  <p className="text-xs text-muted-foreground">{inc.location}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
            <button
              onClick={() => setStep("home")}
              className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground py-2 touch-target"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>
        )}

        {step === "pick-truck" && selectedIncidentId && (
          <TruckPicker
            incidentId={selectedIncidentId}
            mode={mode}
            onSelect={handleTruckPicked}
            onBack={goBackFromTruck}
          />
        )}

        {step === "browse-tickets" && selectedIncidentId && selectedTruck && (
          <BrowseTickets
            incidentTruckId={selectedTruck.itId}
            incidentId={selectedIncidentId}
            onTicketTap={(ticketId) => {
              resetAndClose();
              navigate(`/incidents/${selectedIncidentId}/trucks/${selectedTruck.itId}/shift-ticket/${ticketId}`);
            }}
            onNewTicket={() => {
              const incId = selectedIncidentId;
              const itId = selectedTruck.itId;
              resetAndClose();
              navigate(`/incidents/${incId}/trucks/${itId}/shift-ticket/new`);
            }}
            onBack={() => setStep("pick-truck")}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TruckPicker({
  incidentId,
  mode,
  onSelect,
  onBack,
}: {
  incidentId: string;
  mode: Mode;
  onSelect: (itId: string, incId: string, truckLabel: string) => void;
  onBack: () => void;
}) {
  const { data: trucks, isLoading } = useIncidentTrucks(incidentId);

  // Skip the picker entirely when there's exactly one truck AND we're starting new.
  // For browse we keep the picker so users see context before drilling in.
  if (!isLoading && mode === "new" && trucks?.length === 1) {
    onSelect(trucks[0].id, incidentId, trucks[0].trucks.name);
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
          onClick={() => onSelect(it.id, incidentId, it.trucks.name)}
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
        className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground py-2 touch-target"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
    </div>
  );
}

function BrowseTickets({
  incidentTruckId,
  onTicketTap,
  onNewTicket,
  onBack,
}: {
  incidentTruckId: string;
  incidentId: string;
  onTicketTap: (ticketId: string) => void;
  onNewTicket: () => void;
  onBack: () => void;
}) {
  const { data: tickets, isLoading } = useShiftTickets(incidentTruckId);
  const today = getLocalDateString();

  const sorted = (tickets ?? []).slice().sort((a: any, b: any) => {
    const da = getTicketDate(a);
    const db = getTicketDate(b);
    if (da === db) return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    return db.localeCompare(da);
  });
  const todays = sorted.filter((t: any) => getTicketDate(t) === today);
  const recent = sorted.filter((t: any) => getTicketDate(t) !== today);

  const renderTicket = (t: any) => {
    const dateStr = getTicketDate(t);
    const status = ticketStatusBadge(t);
    return (
      <button
        key={t.id}
        onClick={() => onTicketTap(t.id)}
        className="relative flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-3 text-left card-shadow active:scale-[0.99] transition-transform touch-target"
      >
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate pr-20">{fmtRelative(dateStr)}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {t.incident_name || ""}
          </p>
        </div>
        <span className={`absolute right-3 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>
    );
  };

  return (
    <div className="mt-4 space-y-4 pb-4">
      <button
        onClick={onNewTicket}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-2.5 text-xs font-semibold text-primary touch-target active:bg-primary/10"
      >
        <Plus className="h-4 w-4" />
        New ticket for this truck
      </button>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-xl bg-card border border-border/30 p-6 text-center">
          <FileText className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">No tickets yet for this truck</p>
          <p className="text-xs text-muted-foreground mt-1">Tap above to create the first one.</p>
        </div>
      )}

      {todays.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Today</p>
          <div className="space-y-2">{todays.map(renderTicket)}</div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Recent</p>
          <div className="space-y-2">{recent.map(renderTicket)}</div>
        </section>
      )}

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground py-2 touch-target"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
    </div>
  );
}
