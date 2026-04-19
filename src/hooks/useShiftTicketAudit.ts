import { useQuery } from "@tanstack/react-query";
import { fetchShiftTicketAudit } from "@/services/shift-ticket-audit";

export function useShiftTicketAudit(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["shift-ticket-audit", ticketId],
    queryFn: () => fetchShiftTicketAudit(ticketId!),
    enabled: !!ticketId,
    staleTime: 0,
  });
}
