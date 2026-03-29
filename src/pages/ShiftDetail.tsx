import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useShiftWithCrew } from "@/hooks/useShifts";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";

export default function ShiftDetail() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const truckName = (location.state as { truckName?: string })?.truckName ?? "Truck";
  const { data, isLoading, error } = useShiftWithCrew(shiftId || "");

  if (isLoading) {
    return (
      <AppShell title="">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (error || !data?.shift) {
    return (
      <AppShell title="Shift">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Shift not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary font-semibold touch-target">
            Go Back
          </button>
        </div>
      </AppShell>
    );
  }

  const { shift, crew } = data;
  const totalHours = crew.reduce((sum, c) => sum + c.hours, 0);

  return (
    <AppShell
      title=""
      headerRight={
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-medium text-primary touch-target">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      }
    >
      <div className="p-4 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            {shift.type === "day" ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5 text-primary" />
            )}
            <h2 className="text-xl font-extrabold capitalize">{shift.type} Shift</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{truckName} · {shift.date}</p>
        </div>

        {/* Time info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3">
            <p className="text-xs text-muted-foreground">Start</p>
            <p className="text-sm font-semibold">{formatTime(shift.start_time)}</p>
          </div>
          <div className="rounded-xl bg-card p-3">
            <p className="text-xs text-muted-foreground">End</p>
            <p className="text-sm font-semibold">{formatTime(shift.end_time)}</p>
          </div>
        </div>

        {/* Notes */}
        {shift.notes && (
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{shift.notes}</p>
          </div>
        )}

        {/* Crew */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Crew ({crew.length})
            </h3>
            <span className="text-sm font-semibold">{totalHours.toFixed(1)} total hrs</span>
          </div>

          {crew.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No crew logged.</p>
          )}

          {crew.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-card p-3">
              <div>
                <p className="text-sm font-semibold">{c.crew_members?.name ?? "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.role_on_shift || c.crew_members?.role || ""}
                </p>
                {c.notes && (
                  <p className="text-[11px] text-muted-foreground italic mt-0.5">{c.notes}</p>
                )}
              </div>
              <span className="text-sm font-bold">{c.hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}
