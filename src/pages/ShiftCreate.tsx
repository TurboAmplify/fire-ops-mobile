import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { useCreateShift } from "@/hooks/useShifts";
import { ShiftCrewEditor } from "@/components/shifts/ShiftCrewEditor";
import type { ShiftCrewEntry } from "@/services/shifts";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ShiftType = "day" | "night";

export default function ShiftCreate() {
  const { incidentId, incidentTruckId } = useParams<{
    incidentId: string;
    incidentTruckId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const truckName = (location.state as { truckName?: string })?.truckName ?? "Truck";

  const { data: activeCrew, isLoading: loadingCrew } = useIncidentTruckCrew(incidentTruckId || "");
  const createMutation = useCreateShift(incidentTruckId || "");

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<ShiftType>("day");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"details" | "crew">("details");
  const [crewEntries, setCrewEntries] = useState<ShiftCrewEntry[]>([]);

  // When moving to crew step, prefill from active truck crew
  const goToCrew = () => {
    if (!activeCrew) return;
    const active = activeCrew.filter((c) => c.is_active);
    const defaultHours = computeDefaultHours();
    const entries: ShiftCrewEntry[] = active.map((c) => ({
      crew_member_id: c.crew_member_id,
      hours: defaultHours,
      role_on_shift: c.role_on_assignment || c.crew_members.role,
      notes: null,
    }));
    setCrewEntries(entries);
    setStep("crew");
  };

  const computeDefaultHours = () => {
    try {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      return Math.round((diff / 60) * 10) / 10;
    } catch {
      return 12;
    }
  };

  const handleSubmit = async () => {
    if (!incidentTruckId) return;
    const startIso = `${date}T${startTime}:00`;
    const endIso = `${date}T${endTime}:00`;

    try {
      await createMutation.mutateAsync({
        shift: {
          incident_truck_id: incidentTruckId,
          date,
          type,
          start_time: startIso,
          end_time: endIso,
          notes: notes.trim() || null,
        },
        crew: crewEntries,
      });
      toast.success("Shift logged");
      navigate(`/incidents/${incidentId}`);
    } catch {
      toast.error("Failed to create shift");
    }
  };

  return (
    <AppShell
      title=""
      headerRight={
        <button
          onClick={() => step === "crew" ? setStep("details") : navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === "crew" ? "Back" : "Cancel"}
        </button>
      }
    >
      <div className="p-4 space-y-5">
        <div>
          <h2 className="text-xl font-extrabold">Log Shift</h2>
          <p className="text-sm text-muted-foreground">{truckName}</p>
        </div>

        {step === "details" && (
          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Shift Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["day", "night"] as ShiftType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      if (t === "day") { setStartTime("06:00"); setEndTime("18:00"); }
                      else { setStartTime("18:00"); setEndTime("06:00"); }
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium capitalize transition-colors touch-target ${
                      type === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any shift notes..."
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Next */}
            <button
              onClick={goToCrew}
              disabled={!date || loadingCrew}
              className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
            >
              {loadingCrew && <Loader2 className="h-4 w-4 animate-spin" />}
              Next: Review Crew
            </button>
          </div>
        )}

        {step === "crew" && (
          <div className="space-y-4">
            <ShiftCrewEditor
              entries={crewEntries}
              onChange={setCrewEntries}
              incidentTruckId={incidentTruckId || ""}
            />

            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || crewEntries.length === 0}
              className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Shift ({crewEntries.length} crew)
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
