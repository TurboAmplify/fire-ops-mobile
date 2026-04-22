import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ShiftTicketForm } from "@/components/shift-tickets/ShiftTicketForm";
import { useShiftTicket, useUpdateShiftTicket, useDuplicateShiftTicket } from "@/hooks/useShiftTickets";
import { generateOF297Pdf } from "@/components/shift-tickets/generateOF297Pdf";
import { useOrganization } from "@/hooks/useOrganization";
import { useIncidentTruckCrew } from "@/hooks/useIncidentTruckCrew";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useResourceOrders, useUpdateResourceOrderParsed } from "@/hooks/useResourceOrders";
import { parseResourceOrderAI } from "@/services/resource-orders";
import { syncTicketCrewToIncidentTruck } from "@/services/incident-truck-crew";
import { getLocalDateString } from "@/lib/local-date";
import type { ShiftTicket, PersonnelEntry } from "@/services/shift-tickets";

export default function ShiftTicketEdit() {
  const { incidentId, incidentTruckId, ticketId } = useParams<{
    incidentId: string;
    incidentTruckId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { membership, isAdmin } = useOrganization();
  const { data: ticket, isLoading } = useShiftTicket(ticketId || "");
  const updateMutation = useUpdateShiftTicket(ticketId || "", incidentTruckId || "");
  const { data: crewAssignments } = useIncidentTruckCrew(incidentTruckId || "");
  const { data: incidentTrucks } = useIncidentTrucks(incidentId || "");
  const { data: resourceOrders } = useResourceOrders(incidentTruckId || "");
  const parseRoMutation = useUpdateResourceOrderParsed(incidentTruckId || "");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [autoParsingRo, setAutoParsingRo] = useState(false);
  const autoParseAttempted = useRef<Set<string>>(new Set());
  const duplicateMutation = useDuplicateShiftTicket(incidentTruckId || "");

  // Latest truck data for backfill
  const incidentTruck = useMemo(
    () => incidentTrucks?.find((it) => it.id === incidentTruckId),
    [incidentTrucks, incidentTruckId]
  );
  const truck = incidentTruck?.trucks;

  // Latest parsed resource order for this incident_truck (most recent first)
  const latestParsedRO = useMemo(() => {
    if (!resourceOrders) return null;
    return resourceOrders.find((ro) => ro.parsed_at && ro.parsed_data) ?? null;
  }, [resourceOrders]);

  // Most recent RO regardless of parse status (for auto-parse trigger)
  const mostRecentRO = useMemo(() => {
    if (!resourceOrders || resourceOrders.length === 0) return null;
    return resourceOrders[0];
  }, [resourceOrders]);

  const activeCrew = useMemo(
    () => crewAssignments?.filter((c) => c.is_active) ?? [],
    [crewAssignments]
  );

  // Auto-parse the most recent RO if it's not parsed yet — fire once per RO per page load
  useEffect(() => {
    if (!mostRecentRO) return;
    if (mostRecentRO.parsed_at) return;
    if (autoParseAttempted.current.has(mostRecentRO.id)) return;
    autoParseAttempted.current.add(mostRecentRO.id);
    setAutoParsingRo(true);
    (async () => {
      try {
        const parsed = await parseResourceOrderAI(mostRecentRO.file_url, mostRecentRO.file_name);
        await parseRoMutation.mutateAsync({ id: mostRecentRO.id, parsed });
        toast.success("Resource order parsed — header fields updated");
      } catch (err) {
        console.error("Auto-parse RO failed:", err);
        toast.error("Could not auto-parse resource order. Open it from the incident to retry.");
      } finally {
        setAutoParsingRo(false);
      }
    })();
  }, [mostRecentRO, parseRoMutation]);

  // Build a "backfill" object from truck + RO. Only fields that have a source value.
  const backfill = useMemo(() => {
    const out: Partial<ShiftTicket> = {};
    if (truck) {
      const yr = truck.year ? String(truck.year) : "";
      const mk = truck.make || "";
      const md = truck.model || "";
      const makeModel = [yr, mk, md].filter(Boolean).join(" ").trim();
      if (makeModel) out.equipment_make_model = makeModel;
      if (truck.unit_type) out.equipment_type = truck.unit_type;
      if (truck.vin) out.serial_vin_number = truck.vin;
      if (truck.plate) out.license_id_number = truck.plate;
    }
    if (latestParsedRO?.parsed_data) {
      const p = latestParsedRO.parsed_data as Record<string, any>;
      if (p.agreement_number || p.contract_number) {
        out.agreement_number = p.agreement_number || p.contract_number;
      }
      if (p.resource_order_number) out.resource_order_number = p.resource_order_number;
      if (p.incident_number) out.incident_number = p.incident_number;
      if (p.financial_code) out.financial_code = p.financial_code;
      if (p.incident_name) out.incident_name = p.incident_name;
    }
    if (membership?.organizationName) {
      out.contractor_name = membership.organizationName;
    }
    return out;
  }, [truck, latestParsedRO, membership]);

  // Apply backfill to a ticket: only fills BLANK fields, never overwrites
  const applyBackfill = useCallback(
    <T extends Partial<ShiftTicket>>(target: T): T => {
      const merged = { ...target };
      (Object.keys(backfill) as (keyof ShiftTicket)[]).forEach((k) => {
        const current = (merged as any)[k];
        const source = (backfill as any)[k];
        if ((current === null || current === undefined || current === "") && source) {
          (merged as any)[k] = source;
        }
      });
      return merged;
    },
    [backfill]
  );

  // Merge for display
  const mergedTicket = useMemo(() => {
    if (!ticket) return null;
    return applyBackfill(ticket);
  }, [ticket, applyBackfill]);

  const handleSave = async (data: Partial<ShiftTicket>) => {
    // Persist backfilled values so PDFs and downstream views stay consistent
    const merged = applyBackfill(data);
    await updateMutation.mutateAsync(merged);
  };

  const handleRefreshFromSources = async () => {
    if (!ticket) return;
    // Force-fill all blank fields from latest sources and save
    const merged = applyBackfill(ticket);
    await updateMutation.mutateAsync(merged);
  };

  const handleExportPdf = async (sigOverrides: { contractor_rep_signature_url: string | null; supervisor_signature_url: string | null }) => {
    if (!ticket) return;
    setExportingPdf(true);
    try {
      const ticketForPdf = { ...applyBackfill(ticket), ...sigOverrides } as ShiftTicket;
      await generateOF297Pdf(ticketForPdf);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDuplicate = async () => {
    if (!ticket || !membership?.organizationId) return;
    const currentCrewNames = activeCrew
      .map((c) => c.crew_members?.name?.trim())
      .filter((n): n is string => !!n);
    const newTicket = await duplicateMutation.mutateAsync({
      ticket: ticket as ShiftTicket,
      organizationId: membership.organizationId,
      currentCrewNames,
    });
    navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${newTicket.id}`);
  };

  // Once backfill data lands (truck VIN updated, or RO just got parsed),
  // automatically persist the merged values so they're saved without a tap.
  const lastPersistedSig = useRef<string>("");
  useEffect(() => {
    if (!ticket || !ticketId) return;
    // Compute what would be added by the backfill
    const merged = applyBackfill(ticket);
    const diff: Partial<ShiftTicket> = {};
    (Object.keys(backfill) as (keyof ShiftTicket)[]).forEach((k) => {
      if ((ticket as any)[k] !== (merged as any)[k]) {
        (diff as any)[k] = (merged as any)[k];
      }
    });
    if (Object.keys(diff).length === 0) return;
    // Avoid re-saving the same diff repeatedly
    const sig = JSON.stringify(diff);
    if (sig === lastPersistedSig.current) return;
    lastPersistedSig.current = sig;
    updateMutation.mutate(diff, {
      onError: () => {
        // Allow retry on next render
        lastPersistedSig.current = "";
      },
    });
  }, [ticket, ticketId, backfill, applyBackfill, updateMutation]);

  // Hint flags for the form
  const sourceHints = useMemo(
    () => ({
      truckMissingVin: !truck?.vin,
      truckMissingPlate: !truck?.plate,
      roUnparsed: !latestParsedRO,
      hasResourceOrder: (resourceOrders?.length ?? 0) > 0,
      autoParsingRo,
      truckEditPath: truck?.id ? `/fleet/${truck.id}/edit` : undefined,
      incidentPath: incidentId ? `/incidents/${incidentId}` : undefined,
    }),
    [truck, latestParsedRO, resourceOrders, autoParsingRo, incidentId]
  );

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
      ticket={mergedTicket}
      incidentTruckId={incidentTruckId || ""}
      organizationId={membership?.organizationId || ""}
      saving={updateMutation.isPending}
      onSave={handleSave}
      onExportPdf={handleExportPdf}
      onDuplicate={handleDuplicate}
      duplicating={duplicateMutation.isPending}
      onBack={() => navigate(`/incidents/${incidentId}`)}
      exportingPdf={exportingPdf}
      crewRoster={activeCrew}
      isAdmin={isAdmin}
      onRefreshFromSources={handleRefreshFromSources}
      sourceHints={sourceHints}
    />
  );
}
