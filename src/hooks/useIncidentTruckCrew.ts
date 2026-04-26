import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidentTruckCrew,
  fetchAvailableCrewMembers,
  assignCrewToTruck,
  releaseCrewFromTruck,
} from "@/services/incident-truck-crew";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useIncidentTruckCrew(incidentTruckId: string) {
  return useQuery({
    queryKey: ["incident-truck-crew", incidentTruckId],
    queryFn: () => fetchIncidentTruckCrew(incidentTruckId),
    enabled: !!incidentTruckId,
  });
}

export function useAvailableCrewMembers(organizationId?: string | null) {
  return useQuery({
    queryKey: ["crew_members", organizationId ?? "any"],
    queryFn: () => fetchAvailableCrewMembers(organizationId),
    enabled: organizationId !== undefined,
  });
}

export function useAssignCrew(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ crewMemberId, role }: { crewMemberId: string; role?: string }) => {
      assertOnlineForWrite();
      return assignCrewToTruck(incidentTruckId, crewMemberId, role);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-truck-crew", incidentTruckId] });
    },
  });
}

export function useReleaseCrew(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => {
      assertOnlineForWrite();
      return releaseCrewFromTruck(assignmentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-truck-crew", incidentTruckId] });
    },
  });
}
