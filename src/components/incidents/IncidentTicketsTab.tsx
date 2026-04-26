import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, FileText, ChevronRight, Truck as TruckIcon } from "lucide-react";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useShiftTickets } from "@/hooks/useShiftTickets";
import { getLocalDateString } from "@/lib/local-date";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  incidentId: string;
  incidentName?: string;
}

type TicketRow = {
  id: string;
  incident_truck_id: string;
  status: string | null;
  contractor_rep_signature_url: string | null;
  supervisor_signature_url: string | null;
  equipment_entries: any;
  personnel_entries: any;
  updated_at: string;
};

function getShiftDate(t: TicketRow): string {
  const eq = (t.equipment_entries as any[]) || [];
  const pe = (t.personnel_entries as any[]) || [];
  return eq[0]?.date || pe[0]?.date || (t.updated_at?.split("T")[0] ?? "");
}

function statusFor(t: TicketRow): { label: string; cls: string } {
  if (t.supervisor_signature_url) return { label: "Complete", cls: "bg-green-500/15 text-green-700 dark:text-green-400" };
  if (t.contractor_rep_signature_url) return { label: "Awaiting Supervisor", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (t.status && t.status !== "draft") return { label: "Submitted", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Draft", cls: "bg-muted text-muted-foreground" };
}

function fmtDate(dateStr: string): string {
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

/**
 * Tickets-tab — purpose-built for fast shift-ticket creation and review.
 * Big "+ New Shift Ticket" CTA at the top, today's tickets per truck, then recent.
 */
export function IncidentTicketsTab({ incidentId, incidentName }: Props) {
  const navigate = useNavigate();
  const { data: trucks, isLoading: loadingTrucks } = useIncidentTrucks(incidentId);
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  // Fetch all tickets for this incident in one query
  const truckIds = useMemo(() => trucks?.map((t) => t.id) ?? [], [trucks]);
  const { data: allTickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["incident-tickets", incidentId, truckIds],
    queryFn: async () => {
      if (truckIds.length === 0) return [] as TicketRow[];
      const { data, error } = await supabase
        .from("shift_tickets")
        .select("id, incident_truck_id, status, contractor_rep_signature_url, supervisor_signature_url, equipment_entries, personnel_entries, updated_at")
        .in("incident_truck_id", truckIds)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
    enabled: truckIds.length > 0,
  });

  const truckById = useMemo(() => {
    const m = new Map<string, { name: string; unit_type: string | null }>();
    trucks?.forEach((t) => m.set(t.id, { name: t.trucks.name, unit_type: t.trucks.unit_type }));
    return m;
  }, [trucks]);

  const today = getLocalDateString();
  const todays: TicketRow[] = [];
  const recent: TicketRow[] = [];
  (allTickets ?? []).forEach((t) => {
    if (getShiftDate(t) === today) todays.push(t);
    else recent.push(t);
  });
  // Sort recent by shift date desc
  recent.sort((a, b) => getShiftDate(b).localeCompare(getShiftDate(a)));

  const handleNewClick = () => {
    if (!trucks || trucks.length === 0) return;
    if (trucks.length === 1) {
      navigate(`/incidents/${incidentId}/trucks/${trucks[0].id}/shift-ticket/new`, {
        state: { incidentName, truckName: trucks[0].trucks.name, truckUnitType: trucks[0].trucks.unit_type },
      });
      return;
    }
    setShowTruckPicker(true);
  };

  const openTicket = (t: TicketRow) => {
    navigate(`/incidents/${incidentId}/trucks/${t.incident_truck_id}/shift-ticket/${t.id}`);
  };

  const renderTicket = (t: TicketRow) => {
    const truck = truckById.get(t.incident_truck_id);
    const truckLabel = truck?.unit_type || truck?.name || "Truck";
    const dateStr = getShiftDate(t);
    const status = statusFor(t);
    return (
      <button
        key={t.id}
        onClick={() => openTicket(t)}
        className="relative flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-3 text-left card-shadow active:scale-[0.99] transition-transform touch-target"
      >
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate pr-16">{truckLabel}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(dateStr)}</p>
        </div>
        <span className={`absolute right-3 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>
    );
  };

  const isLoading = loadingTrucks || loadingTickets;
  const noTrucks = !loadingTrucks && (!trucks || trucks.length === 0);

  return (
    <div className="space-y-5">
      {/* Primary CTA */}
      <button
        onClick={handleNewClick}
        disabled={noTrucks}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
      >
        <Plus className="h-5 w-5" />
        New Shift Ticket
      </button>

      {noTrucks && (
        <p className="text-xs text-muted-foreground text-center">
          Assign a truck to this incident first.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Today */}
      {!isLoading && todays.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Today</p>
          <div className="space-y-2">{todays.map(renderTicket)}</div>
        </section>
      )}

      {/* Recent */}
      {!isLoading && recent.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Recent</p>
          <div className="space-y-2">{recent.slice(0, 10).map(renderTicket)}</div>
        </section>
      )}

      {!isLoading && allTickets && allTickets.length === 0 && !noTrucks && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No shift tickets yet. Tap "New Shift Ticket" to create one.
        </p>
      )}

      {/* Truck picker bottom sheet */}
      <Sheet open={showTruckPicker} onOpenChange={setShowTruckPicker}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Select a truck</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {trucks?.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setShowTruckPicker(false);
                  navigate(`/incidents/${incidentId}/trucks/${it.id}/shift-ticket/new`, {
                    state: { incidentName, truckName: it.trucks.name, truckUnitType: it.trucks.unit_type },
                  });
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-4 text-left active:scale-[0.99] transition-transform touch-target"
              >
                <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{it.trucks.name}</p>
                  {it.trucks.unit_type && (
                    <p className="text-[11px] text-muted-foreground">{it.trucks.unit_type}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
