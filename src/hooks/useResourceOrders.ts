import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchResourceOrders,
  createResourceOrder,
  updateResourceOrderParsed,
} from "@/services/resource-orders";

export function useResourceOrders(incidentTruckId: string) {
  return useQuery({
    queryKey: ["resource-orders", incidentTruckId],
    queryFn: () => fetchResourceOrders(incidentTruckId),
    enabled: !!incidentTruckId,
  });
}

export function useCreateResourceOrder(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { incident_truck_id: string; file_url: string; file_name: string }) =>
      createResourceOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource-orders", incidentTruckId] });
    },
  });
}

export function useUpdateResourceOrderParsed(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parsed }: { id: string; parsed: Record<string, any> }) =>
      updateResourceOrderParsed(id, parsed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource-orders", incidentTruckId] });
    },
  });
}
