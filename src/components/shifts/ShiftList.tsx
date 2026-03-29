import { useShifts } from "@/hooks/useShifts";
import { Clock, Plus, Loader2, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  incidentTruckId: string;
  incidentId: string;
  truckName: string;
}

export function ShiftList({ incidentTruckId, incidentId, truckName }: Props) {
  const { data: shifts, isLoading } = useShifts(incidentTruckId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Shifts ({shifts?.length ?? 0})</span>
        </div>
        <Link
          to={`/incidents/${incidentId}/trucks/${incidentTruckId}/shifts/new`}
          state={{ truckName }}
          className="flex items-center gap-1 text-xs font-medium text-primary touch-target"
        >
          <Plus className="h-3 w-3" />
          Log Shift
        </Link>
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {!isLoading && (!shifts || shifts.length === 0) && (
        <p className="text-xs text-muted-foreground">No shifts logged yet.</p>
      )}

      {shifts?.map((shift) => (
        <Link
          key={shift.id}
          to={`/incidents/${incidentId}/trucks/${incidentTruckId}/shifts/${shift.id}`}
          state={{ truckName }}
          className="flex items-center justify-between rounded-lg bg-secondary p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            {shift.type === "day" ? (
              <Sun className="h-3.5 w-3.5 text-warning" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-primary" />
            )}
            <div>
              <p className="text-sm font-medium">{shift.date}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{shift.type} shift</p>
            </div>
          </div>
          {shift.start_time && shift.end_time && (
            <span className="text-[11px] text-muted-foreground">
              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
