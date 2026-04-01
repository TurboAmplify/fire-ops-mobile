import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ShiftTicketForm } from "@/components/shift-tickets/ShiftTicketForm";
import { useShiftTicket, useUpdateShiftTicket } from "@/hooks/useShiftTickets";
import { generateOF297Pdf } from "@/components/shift-tickets/generateOF297Pdf";
import { useOrganization } from "@/hooks/useOrganization";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import type { ShiftTicket } from "@/services/shift-tickets";

export default function ShiftTicketEdit() {
  const { incidentId, incidentTruckId, ticketId } = useParams<{
    incidentId: string;
    incidentTruckId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { membership } = useOrganization();
  const { data: ticket, isLoading } = useShiftTicket(ticketId || "");
  const updateMutation = useUpdateShiftTicket(ticketId || "", incidentTruckId || "");
  const { data: crewAssignments } = useIncidentTruckCrew(incidentTruckId || "");
  const [exportingPdf, setExportingPdf] = useState(false);

  const activeCrew = useMemo(
    () => crewAssignments?.filter((c) => c.is_active) ?? [],
    [crewAssignments]
  );

  const handleSave = async (data: Partial<ShiftTicket>) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Shift ticket saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleExportPdf = async (sigOverrides: { contractor_rep_signature_url: string | null; supervisor_signature_url: string | null }) => {
    if (!ticket) return;
    setExportingPdf(true);
    try {
      const ticketForPdf = { ...ticket, ...sigOverrides } as ShiftTicket;
      await generateOF297Pdf(ticketForPdf);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Shift Ticket">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <ShiftTicketForm
      ticket={ticket || null}
      incidentTruckId={incidentTruckId || ""}
      organizationId={membership?.organizationId || ""}
      saving={updateMutation.isPending}
      onSave={handleSave}
      onExportPdf={handleExportPdf}
      onBack={() => navigate(`/incidents/${incidentId}`)}
      exportingPdf={exportingPdf}
      crewRoster={activeCrew}
    />
  );
}
