import { useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useShiftTickets } from "@/hooks/useShiftTickets";

interface Props {
  incidentTruckId: string;
  incidentId: string;
  truckName?: string | null;
  truckMake?: string | null;
  truckModel?: string | null;
  truckVin?: string | null;
  truckPlate?: string | null;
  truckUnitType?: string | null;
  incidentName?: string;
}

export function ShiftTicketSection({
  incidentTruckId,
  incidentId,
  truckName,
  truckMake,
  truckModel,
  truckVin,
  truckPlate,
  truckUnitType,
  incidentName,
}: Props) {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useShiftTickets(incidentTruckId);

  const navState = { truckName, truckMake, truckModel, truckVin, truckPlate, truckUnitType, incidentName };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OF-297 Shift Tickets</p>
        <button
          onClick={() => navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/new`, { state: navState })}
          className="flex items-center gap-1 text-xs font-bold text-primary touch-target"
        >
          <Plus className="h-3.5 w-3.5" /> New Ticket
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!tickets || tickets.length === 0) && (
        <p className="text-xs text-muted-foreground py-2 text-center">No shift tickets yet.</p>
      )}

      {tickets?.map((t) => (
        <button
          key={t.id}
          onClick={() => navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${t.id}`)}
          className="flex w-full items-center gap-3 rounded-lg bg-secondary p-3 text-left transition-transform active:scale-[0.98] touch-target"
        >
          <FileText className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {t.agreement_number || "OF-297"} {t.incident_name ? `- ${t.incident_name}` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t.status === "draft" ? "Draft" : "Final"} | {new Date(t.updated_at).toLocaleDateString()}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
