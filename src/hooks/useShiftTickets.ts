import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchShiftTickets,
  fetchShiftTicket,
  createShiftTicket,
  updateShiftTicket,
  deleteShiftTicket,
  duplicateShiftTicket,
} from "@/services/shift-tickets";
import type { ShiftTicket } from "@/services/shift-tickets";
import { assertOnlineForWrite, isOnline } from "@/lib/offline-guard";
import { enqueue } from "@/lib/offline-queue";
import { toast } from "sonner";

/**
 * Build a complete-looking ShiftTicket row for an offline create so the UI
 * has something stable to render until the queue syncs.
 */
function buildOfflineTicket(input: Partial<ShiftTicket> & { incident_truck_id: string; organization_id: string }): ShiftTicket {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    incident_truck_id: input.incident_truck_id,
    resource_order_id: input.resource_order_id ?? null,
    organization_id: input.organization_id,
    status: input.status ?? "draft",
    agreement_number: input.agreement_number ?? null,
    contractor_name: input.contractor_name ?? null,
    resource_order_number: input.resource_order_number ?? null,
    incident_name: input.incident_name ?? null,
    incident_number: input.incident_number ?? null,
    financial_code: input.financial_code ?? null,
    equipment_make_model: input.equipment_make_model ?? null,
    equipment_type: input.equipment_type ?? null,
    serial_vin_number: input.serial_vin_number ?? null,
    license_id_number: input.license_id_number ?? null,
    transport_retained: input.transport_retained ?? null,
    is_first_last: input.is_first_last ?? null,
    first_last_type: input.first_last_type ?? null,
    miles: input.miles ?? null,
    equipment_entries: input.equipment_entries ?? [],
    personnel_entries: input.personnel_entries ?? [],
    remarks: input.remarks ?? null,
    contractor_rep_name: input.contractor_rep_name ?? null,
    contractor_rep_signature_url: input.contractor_rep_signature_url ?? null,
    contractor_rep_signed_at: input.contractor_rep_signed_at ?? null,
    supervisor_name: input.supervisor_name ?? null,
    supervisor_resource_order: input.supervisor_resource_order ?? null,
    supervisor_signature_url: input.supervisor_signature_url ?? null,
    supervisor_signed_at: input.supervisor_signed_at ?? null,
    created_at: now,
    updated_at: now,
  } as ShiftTicket;
}

export function useShiftTickets(incidentTruckId: string) {
  return useQuery({
    queryKey: ["shift-tickets", incidentTruckId],
    queryFn: () => fetchShiftTickets(incidentTruckId),
    enabled: !!incidentTruckId,
  });
}

export function useShiftTicket(id: string) {
  return useQuery({
    queryKey: ["shift-ticket", id],
    queryFn: () => fetchShiftTicket(id),
    enabled: !!id,
  });
}

export function useCreateShiftTicket(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Parameters<typeof createShiftTicket>[0]) => {
      if (!isOnline()) {
        // Offline: synthesize a row, cache it, queue the insert for sync.
        const offlineTicket = buildOfflineTicket(ticket);
        await enqueue({
          table: "shift_tickets",
          operation: "insert",
          payload: offlineTicket as unknown as Record<string, unknown>,
        });
        // Seed query caches so the form/list see the new row immediately.
        qc.setQueryData<ShiftTicket[] | undefined>(["shift-tickets", incidentTruckId], (prev) =>
          prev ? [offlineTicket, ...prev] : [offlineTicket],
        );
        qc.setQueryData(["shift-ticket", offlineTicket.id], offlineTicket);
        toast.success("Saved on device", {
          description: "Will sync to the server when you're back online.",
        });
        return offlineTicket;
      }
      return createShiftTicket(ticket);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["incident-daily-crew"] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
    },
  });
}

export function useUpdateShiftTicket(ticketId: string, incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ShiftTicket>) => {
      if (!isOnline()) {
        await enqueue({
          table: "shift_tickets",
          operation: "update",
          rowId: ticketId,
          payload: { ...updates, updated_at: new Date().toISOString() } as Record<string, unknown>,
        });
        // Patch caches so the form keeps the user's edits across navigation.
        qc.setQueryData<ShiftTicket | null | undefined>(["shift-ticket", ticketId], (prev) =>
          prev ? ({ ...prev, ...updates, updated_at: new Date().toISOString() } as ShiftTicket) : prev,
        );
        qc.setQueryData<ShiftTicket[] | undefined>(["shift-tickets", incidentTruckId], (prev) =>
          prev?.map((t) => (t.id === ticketId ? ({ ...t, ...updates } as ShiftTicket) : t)),
        );
        toast.success("Saved on device", {
          description: "Will sync to the server when you're back online.",
        });
        return;
      }
      return updateShiftTicket(ticketId, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      qc.invalidateQueries({ queryKey: ["incident-daily-crew"] });
    },
  });
}

export function useDeleteShiftTicket(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => {
      assertOnlineForWrite();
      return deleteShiftTicket(id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["incident-daily-crew"] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      qc.invalidateQueries({ queryKey: ["incident-tickets"] });
      qc.invalidateQueries({ queryKey: ["all-shift-tickets-payroll"] });
    },
  });
}

export type RecentShiftTicket = ShiftTicket & {
  incident_trucks: { incident_id: string; trucks: { name: string; unit_type: string | null } } | null;
};

/** Extract the actual shift date from a ticket's entries (YYYY-MM-DD), falling back to updated_at. */
function getShiftDate(t: RecentShiftTicket): string {
  const eq = (t.equipment_entries as any[]) || [];
  const pe = (t.personnel_entries as any[]) || [];
  return eq[0]?.date || pe[0]?.date || (t.updated_at?.split("T")[0] ?? "");
}

export function useRecentShiftTickets(limit = 25) {
  return useQuery({
    queryKey: ["shift-tickets-recent", limit],
    queryFn: async () => {
      // Pull a wider window from the server (ordered by updated_at as a proxy),
      // then re-sort on the client by the actual shift date so the user sees
      // the most recent shifts, not whichever ticket was last touched.
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("shift_tickets")
        .select("*, incident_trucks(incident_id, trucks(name, unit_type))")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(Math.max(limit * 3, 50));
      if (error) throw error;
      const rows = (data ?? []) as unknown as RecentShiftTicket[];
      rows.sort((a, b) => {
        const da = getShiftDate(a);
        const db = getShiftDate(b);
        if (da !== db) return db.localeCompare(da);
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      });
      return rows.slice(0, limit);
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useLatestTicketPerTruck() {
  const { data, ...rest } = useRecentShiftTickets(50);
  // After date-sorting, dedupe by incident_truck_id keeping the first (= most recent shift)
  const latestPerTruck = data
    ? data.filter(
        (t, i, self) => i === self.findIndex((s) => s.incident_truck_id === t.incident_truck_id)
      )
    : undefined;
  return { data: latestPerTruck, ...rest };
}

export function useDuplicateShiftTicket(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticket, organizationId, currentCrewNames }: { ticket: ShiftTicket; organizationId: string; currentCrewNames?: string[] }) => {
      assertOnlineForWrite();
      return duplicateShiftTicket(ticket, organizationId, currentCrewNames);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      qc.invalidateQueries({ queryKey: ["incident-daily-crew"] });
    },
  });
}
