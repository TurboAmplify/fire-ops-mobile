import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getLocalDateString } from "@/lib/local-date";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { useResourceOrders } from "@/hooks/useResourceOrders";
import { useCreateShift } from "@/hooks/useShifts";
import { ShiftCrewEditor } from "@/components/shifts/ShiftCrewEditor";
import { OF297Header } from "@/components/shifts/OF297Header";
import type { ShiftCrewEntry } from "@/services/shifts";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

type ShiftType = "day" | "night";

export default function ShiftCreate() {
  const { incidentId, incidentTruckId } = useParams<{
    incidentId: string;
    incidentTruckId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as {
    truckName?: string;
    truckMake?: string;
    truckModel?: string;
    truckVin?: string;
    truckPlate?: string;
    truckUnitType?: string;
    incidentName?: string;
  } | undefined;

  const truckName = locState?.truckName ?? "Truck";
  const { membership } = useOrganization();

  const { data: activeCrew, isLoading: loadingCrew } = useIncidentTruckCrew(incidentTruckId || "");
  const { data: resourceOrders } = useResourceOrders(incidentTruckId || "");
  const createMutation = useCreateShift(incidentTruckId || "");

  const [date, setDate] = useState(() => getLocalDateString());
  const [type, setType] = useState<ShiftType>("day");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [miles, setMiles] = useState("");
  const [isFirstLast, setIsFirstLast] = useState(false);
  const [transportRetained, setTransportRetained] = useState(false);
  const [step, setStep] = useState<"details" | "crew">("details");
  const [crewEntries, setCrewEntries] = useState<ShiftCrewEntry[]>([]);

  // Get the most recent parsed resource order
  const latestRO = resourceOrders?.find((ro) => ro.parsed_at != null);
  const roData = (latestRO?.parsed_data || {}) as Record<string, any>;

  // Build OF-297 header data from resource order + truck + location state
  const of297Data = {
    agreementNumber: roData.agreement_number || latestRO?.agreement_number,
    contractorName: roData.contractor_name || membership?.organizationName,
    resourceOrderNumber: roData.resource_order_number || latestRO?.resource_order_number,
    incidentName: roData.incident_name || locState?.incidentName,
    incidentNumber: roData.incident_number,
    financialCode: roData.financial_code,
    equipmentMakeModel: locState?.truckMake && locState?.truckModel
      ? `${locState.truckMake} ${locState.truckModel}`
      : locState?.truckMake || roData.equipment_make_model,
    equipmentType: locState?.truckUnitType || roData.equipment_type,
    vinNumber: locState?.truckVin || roData.vin_number,
    licensePlate: locState?.truckPlate || roData.license_plate,
  };

  // When moving to crew step, prefill from active truck crew
  const goToCrew = () => {
    if (!activeCrew) return;
    const active = activeCrew.filter((c) => c.is_active);
    const entries: ShiftCrewEntry[] = active.map((c) => ({
      crew_member_id: c.crew_member_id,
      hours: 0,
      role_on_shift: c.role_on_assignment || c.crew_members.role,
      notes: null,
      operating_start: startTime,
      operating_stop: endTime,
      standby_start: null,
      standby_stop: null,
    }));
    // Auto-compute initial hours
    entries.forEach((e) => {
      e.hours = computeDefaultHours();
    });
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
          miles: miles ? parseFloat(miles) : null,
          is_first_last: isFirstLast,
          transport_retained: transportRetained,
          incident_number: roData.incident_number || null,
          financial_code: roData.financial_code || null,
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
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold">Log Shift</h2>
          <p className="text-sm text-muted-foreground">{truckName}</p>
        </div>

        {/* OF-297 Header Info */}
        <OF297Header {...of297Data} />

        {step === "details" && (
          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                />
              </div>
            </div>

            {/* Miles */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Miles</label>
              <input
                type="number"
                inputMode="decimal"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>

            {/* OF-297 flags */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 touch-target">
                <input
                  type="checkbox"
                  checked={isFirstLast}
                  onChange={(e) => setIsFirstLast(e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">First/Last Ticket (Mob/Demob)</span>
              </label>
              <label className="flex items-center gap-3 touch-target">
                <input
                  type="checkbox"
                  checked={transportRetained}
                  onChange={(e) => setTransportRetained(e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">Transport Retained</span>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Remarks (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Equipment breakdown, operating issues..."
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
              Next: Crew Times
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
