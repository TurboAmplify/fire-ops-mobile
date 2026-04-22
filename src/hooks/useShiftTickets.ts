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
    mutationFn: (ticket: Parameters<typeof createShiftTicket>[0]) => createShiftTicket(ticket),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
    },
  });
}

export function useUpdateShiftTicket(ticketId: string, incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<ShiftTicket>) => updateShiftTicket(ticketId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
    },
  });
}

export function useDeleteShiftTicket(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShiftTicket(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
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
    mutationFn: ({ ticket, organizationId }: { ticket: ShiftTicket; organizationId: string }) =>
      duplicateShiftTicket(ticket, organizationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
    },
  });
}
