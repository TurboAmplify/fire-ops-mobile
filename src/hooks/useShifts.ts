import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchShifts,
  fetchShiftWithCrew,
  createShiftWithCrew,
  fetchAllShifts,
} from "@/services/shifts";
import type { ShiftInsert, ShiftCrewEntry } from "@/services/shifts";
import { useOrganization } from "@/hooks/useOrganization";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useAllShifts() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["all-shifts", orgId],
    queryFn: () => fetchAllShifts(orgId),
    enabled: !!orgId,
  });
}

export function useShifts(incidentTruckId: string) {
  return useQuery({
    queryKey: ["shifts", incidentTruckId],
    queryFn: () => fetchShifts(incidentTruckId),
    enabled: !!incidentTruckId,
  });
}

export function useShiftWithCrew(shiftId: string) {
  return useQuery({
    queryKey: ["shift-detail", shiftId],
    queryFn: () => fetchShiftWithCrew(shiftId),
    enabled: !!shiftId,
  });
}

export function useCreateShift(incidentTruckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shift,
      crew,
    }: {
      shift: ShiftInsert;
      crew: ShiftCrewEntry[];
    }) => {
      assertOnlineForWrite();
      return createShiftWithCrew(shift, crew);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts", incidentTruckId] });
    },
  });
}
