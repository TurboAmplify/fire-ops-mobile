import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { getLocalDateString } from "@/lib/local-date";
import { ShiftTicketForm } from "@/components/shift-tickets/ShiftTicketForm";
import { useCreateShiftTicket, useUpdateShiftTicket } from "@/hooks/useShiftTickets";
import { useResourceOrders } from "@/hooks/useResourceOrders";
import { useOrganization } from "@/hooks/useOrganization";
import { useIncident } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { useAgreements } from "@/hooks/useAgreements";
import { generateOF297Pdf } from "@/components/shift-tickets/generateOF297Pdf";
import type { ShiftTicket, PersonnelEntry } from "@/services/shift-tickets";

export default function ShiftTicketCreate() {
  const { incidentId, incidentTruckId } = useParams<{ incidentId: string; incidentTruckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as Record<string, string> | undefined;
  const { membership } = useOrganization();
  const orgId = membership?.organizationId || "";

  // Fetch relational data
  const { data: incident } = useIncident(incidentId || "");
  const { data: incidentTrucks } = useIncidentTrucks(incidentId || "");
  const { data: resourceOrders } = useResourceOrders(incidentTruckId || "");
  const { data: crewAssignments } = useIncidentTruckCrew(incidentTruckId || "");
  const { data: agreements } = useAgreements({ incidentId, incidentTruckId });

  // Find the truck record from incident_trucks join
  const incidentTruck = useMemo(
    () => incidentTrucks?.find((it) => it.id === incidentTruckId),
    [incidentTrucks, incidentTruckId]
  );
  const truck = incidentTruck?.trucks;

  // Active crew for this truck on this incident
  const activeCrew = useMemo(
    () => crewAssignments?.filter((c) => c.is_active) ?? [],
    [crewAssignments]
  );

  const createMutation = useCreateShiftTicket(incidentTruckId || "");

  const [ticket, setTicket] = useState<Partial<ShiftTicket> | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Build initial ticket from all relational data
  useEffect(() => {
    if (ticket?.id || initialized) return; // Already created or initialized
    // Wait for critical data to load before initializing
    if (!incident && incidentId) return;
    if (!resourceOrders && incidentTruckId) return;
    if (!incidentTrucks && incidentId) return;
    if (!crewAssignments && incidentTruckId) return; // Wait for crew data

    const latestRO = resourceOrders?.find((ro) => ro.parsed_at != null);
    const roData = (latestRO?.parsed_data || {}) as Record<string, any>;

    // Pull agreement data (from agreements table and its parsed data)
    const latestAgreement = agreements?.find((a) => a.agreement_number) || agreements?.[0];
    const agreementParsed = (latestAgreement?.parsed_data || {}) as Record<string, any>;

    // Build personnel entries from assigned crew
    const personnelEntries: PersonnelEntry[] = activeCrew.length > 0
      ? activeCrew.map((c) => ({
          date: getLocalDateString(),
          operator_name: c.crew_members?.name || "",
          op_start: "",
          op_stop: "",
          sb_start: "",
          sb_stop: "",
          total: 0,
          remarks: "Work",
          activity_type: "work" as const,
          lodging: false,
          per_diem_b: false,
          per_diem_l: false,
          per_diem_d: false,
        }))
      : [];

    // Build equipment make/model with all available truck info
    const equipmentMakeModel = (() => {
      if (!truck) return roData.equipment_make_model || "";
      const parts: string[] = [];
      if (truck.year) parts.push(String(truck.year));
      if (truck.make) parts.push(truck.make);
      if (truck.model) parts.push(truck.model);
      // If we have year but no make/model, use truck name as identifier
      if (parts.length <= 1 && truck.name) parts.push(truck.name);
      return parts.join(" ").trim() || roData.equipment_make_model || "";
    })();

    setTicket({
      agreement_number: latestAgreement?.agreement_number || agreementParsed.agreement_number || roData.agreement_number || roData.contract_number || latestRO?.agreement_number || "",
      contractor_name: agreementParsed.contractor_name || roData.contractor_name || membership?.organizationName || "",
      resource_order_number: roData.resource_order_number || latestRO?.resource_order_number || "",
      incident_name: incident?.name || roData.incident_name || locState?.incidentName || "",
      incident_number: roData.incident_number || "",
      financial_code: agreementParsed.financial_code || roData.financial_code || "",
      equipment_make_model: equipmentMakeModel,
      equipment_type: truck?.unit_type || roData.equipment_type || "",
      serial_vin_number: truck?.vin || roData.vin_number || "",
      license_id_number: truck?.plate || roData.license_plate || "",
      resource_order_id: latestRO?.id || null,
      status: "draft",
      ...(personnelEntries.length > 0 ? { personnel_entries: personnelEntries as any } : {}),
    });
    setInitialized(true);
  }, [resourceOrders, membership, locState, ticket?.id, initialized, incident, truck, activeCrew, incidentId, agreements]);

  const updateMutation = useUpdateShiftTicket(ticket?.id || "", incidentTruckId || "");

  // Warnings
  const warnings: string[] = [];
  if (initialized && activeCrew.length === 0) {
    warnings.push("No crew currently assigned to this truck for this incident.");
  }
  if (initialized && (!resourceOrders || resourceOrders.length === 0)) {
    warnings.push("No resource orders found for this truck assignment.");
  } else if (initialized && !resourceOrders?.some((ro) => ro.parsed_at)) {
    warnings.push("Resource Order missing linked incident data. Fields may need manual entry.");
  }

  const handleSave = async (data: Partial<ShiftTicket>) => {
    if (!orgId) {
      throw new Error("Organization not loaded yet");
    }
    // Strip empty-string org/truck ids from form data before merging
    const { organization_id: _o, incident_truck_id: _t, ...cleanData } = data as any;
    if (ticket?.id) {
      await updateMutation.mutateAsync(cleanData);
      setTicket((prev) => ({ ...prev, ...cleanData }));
    } else {
      const created = await createMutation.mutateAsync({
        ...cleanData,
        incident_truck_id: incidentTruckId!,
        organization_id: orgId,
      } as any);
      setTicket(created);
    }
  };

  const handleExportPdf = async (sigOverrides: { contractor_rep_signature_url: string | null; supervisor_signature_url: string | null }) => {
    if (!ticket?.id) return;
    setExportingPdf(true);
    try {
      const ticketForPdf = { ...ticket, ...sigOverrides } as ShiftTicket;
      await generateOF297Pdf(ticketForPdf);
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
      warnings={warnings}
      crewRoster={activeCrew}
    />
  );
}
