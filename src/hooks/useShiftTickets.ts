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

export function useRecentShiftTickets(limit = 5) {
  return useQuery({
    queryKey: ["shift-tickets-recent", limit],
    queryFn: async () => {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("shift_tickets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ShiftTicket[];
    },
  });
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticket, organizationId }: { ticket: ShiftTicket; organizationId: string }) =>
      duplicateShiftTicket(ticket, organizationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-tickets", incidentTruckId] });
    },
  });
}
