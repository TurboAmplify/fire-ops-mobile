import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidentTrucks,
  fetchAvailableTrucks,
  assignTruckToIncident,
  updateIncidentTruckStatus,
  removeTruckFromIncident,
} from "@/services/incident-trucks";
import type { IncidentTruckStatus } from "@/services/incident-trucks";

export function useIncidentTrucks(incidentId: string) {
  return useQuery({
    queryKey: ["incident-trucks", incidentId],
    queryFn: () => fetchIncidentTrucks(incidentId),
    enabled: !!incidentId,
  });
}

export function useAvailableTrucks() {
  return useQuery({
    queryKey: ["trucks"],
    queryFn: fetchAvailableTrucks,
  });
}

export function useAssignTruck(incidentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (truckId: string) => assignTruckToIncident(incidentId, truckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-trucks", incidentId] });
    },
  });
}

export function useUpdateTruckStatus(incidentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentTruckStatus }) =>
      updateIncidentTruckStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-trucks", incidentId] });
    },
  });
}

export function useRemoveTruck(incidentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeTruckFromIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-trucks", incidentId] });
    },
  });
}
