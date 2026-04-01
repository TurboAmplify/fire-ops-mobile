import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShiftTicketForm } from "@/components/shift-tickets/ShiftTicketForm";
import { useCreateShiftTicket, useUpdateShiftTicket } from "@/hooks/useShiftTickets";
import { useResourceOrders } from "@/hooks/useResourceOrders";
import { useOrganization } from "@/hooks/useOrganization";
import { generateOF297Pdf } from "@/components/shift-tickets/generateOF297Pdf";
import type { ShiftTicket } from "@/services/shift-tickets";

export default function ShiftTicketCreate() {
  const { incidentId, incidentTruckId } = useParams<{ incidentId: string; incidentTruckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as Record<string, string> | undefined;
  const { membership } = useOrganization();
  const orgId = membership?.organizationId || "";

  const { data: resourceOrders } = useResourceOrders(incidentTruckId || "");
  const createMutation = useCreateShiftTicket(incidentTruckId || "");

  const [ticket, setTicket] = useState<Partial<ShiftTicket> | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Build initial ticket from resource order data
  useEffect(() => {
    if (ticket?.id) return; // Already created
    const latestRO = resourceOrders?.find((ro) => ro.parsed_at != null);
    const roData = (latestRO?.parsed_data || {}) as Record<string, any>;

    setTicket({
      agreement_number: roData.agreement_number || latestRO?.agreement_number || "",
      contractor_name: roData.contractor_name || membership?.organizationName || "",
      resource_order_number: roData.resource_order_number || latestRO?.resource_order_number || "",
      incident_name: roData.incident_name || locState?.incidentName || "",
      incident_number: roData.incident_number || "",
      financial_code: roData.financial_code || "",
      equipment_make_model: locState?.truckMake && locState?.truckModel
        ? `${locState.truckMake} ${locState.truckModel}`
        : roData.equipment_make_model || "",
      equipment_type: locState?.truckUnitType || roData.equipment_type || "",
      serial_vin_number: locState?.truckVin || roData.vin_number || "",
      license_id_number: locState?.truckPlate || roData.license_plate || "",
      resource_order_id: latestRO?.id || null,
      status: "draft",
    });
  }, [resourceOrders, membership, locState, ticket?.id]);

  const updateMutation = useUpdateShiftTicket(ticket?.id || "", incidentTruckId || "");

  const handleSave = async (data: Partial<ShiftTicket>) => {
    try {
      if (ticket?.id) {
        await updateMutation.mutateAsync(data);
        setTicket((prev) => ({ ...prev, ...data }));
        toast.success("Shift ticket saved");
      } else {
        const created = await createMutation.mutateAsync({
          ...data,
          incident_truck_id: incidentTruckId!,
          organization_id: orgId,
        } as any);
        setTicket(created);
        toast.success("Shift ticket created");
      }
    } catch {
      toast.error("Failed to save shift ticket");
    }
  };

  const handleExportPdf = async () => {
    if (!ticket?.id) return;
    setExportingPdf(true);
    try {
      await generateOF297Pdf(ticket as ShiftTicket);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <ShiftTicketForm
      ticket={ticket}
      incidentTruckId={incidentTruckId || ""}
      organizationId={orgId}
      saving={createMutation.isPending || updateMutation.isPending}
      onSave={handleSave}
      onExportPdf={handleExportPdf}
      onBack={() => navigate(`/incidents/${incidentId}`)}
      exportingPdf={exportingPdf}
    />
  );
}
