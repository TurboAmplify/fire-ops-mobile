import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useShiftWithCrew } from "@/hooks/useShifts";
import { useResourceOrders } from "@/hooks/useResourceOrders";
import { OF297Header } from "@/components/shifts/OF297Header";
import { useOrganization } from "@/hooks/useOrganization";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";

export default function ShiftDetail() {
  const { incidentTruckId, shiftId } = useParams<{ incidentTruckId: string; shiftId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const truckName = (location.state as { truckName?: string })?.truckName ?? "Truck";
  const { data, isLoading, error } = useShiftWithCrew(shiftId || "");
  const { data: resourceOrders } = useResourceOrders(incidentTruckId || "");
  const { membership } = useOrganization();

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
  const totalHours = crew.reduce((sum: number, c: any) => sum + c.hours, 0);

  // Build OF-297 header from shift relations + resource order
  const latestRO = resourceOrders?.find((ro) => ro.parsed_at != null);
  const roData = (latestRO?.parsed_data || {}) as Record<string, any>;
  const truckData = (shift as any).incident_trucks?.trucks;
  const incidentData = (shift as any).incident_trucks?.incidents;

  const of297Data = {
    agreementNumber: roData.agreement_number || latestRO?.agreement_number,
    contractorName: roData.contractor_name || membership?.organizationName,
    resourceOrderNumber: roData.resource_order_number || latestRO?.resource_order_number,
    incidentName: roData.incident_name || incidentData?.name,
    incidentNumber: (shift as any).incident_number || roData.incident_number,
    financialCode: (shift as any).financial_code || roData.financial_code,
    equipmentMakeModel: truckData?.make && truckData?.model
      ? `${truckData.make} ${truckData.model}`
      : truckData?.make || roData.equipment_make_model,
    equipmentType: truckData?.unit_type || roData.equipment_type,
    vinNumber: truckData?.vin || roData.vin_number,
    licensePlate: truckData?.plate || roData.license_plate,
  };

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
      <div className="p-4 space-y-4">
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

        {/* OF-297 Header */}
        <OF297Header {...of297Data} />

        {/* Time & Miles info */}
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

        {/* OF-297 flags */}
        <div className="flex flex-wrap gap-2">
          {(shift as any).miles != null && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {(shift as any).miles} mi
            </span>
          )}
          {(shift as any).is_first_last && (
            <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold">
              First/Last Ticket
            </span>
          )}
          {(shift as any).transport_retained && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              Transport Retained
            </span>
          )}
        </div>

        {/* Notes/Remarks */}
        {shift.notes && (
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
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
            <div key={c.id} className="rounded-xl bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{c.crew_members?.name ?? "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.role_on_shift || c.crew_members?.role || ""}
                  </p>
                </div>
                <span className="text-sm font-bold">{c.hours}h</span>
              </div>

              {/* Time breakdown */}
              {(c.operating_start || c.standby_start) && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {c.operating_start && (
                    <div>
                      <span className="text-muted-foreground">Operating: </span>
                      <span className="font-medium">{c.operating_start} - {c.operating_stop || "—"}</span>
                    </div>
                  )}
                  {c.standby_start && (
                    <div>
                      <span className="text-muted-foreground">Standby: </span>
                      <span className="font-medium">{c.standby_start} - {c.standby_stop || "—"}</span>
                    </div>
                  )}
                </div>
              )}

              {c.notes && (
                <p className="text-[11px] text-muted-foreground italic">{c.notes}</p>
              )}
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
